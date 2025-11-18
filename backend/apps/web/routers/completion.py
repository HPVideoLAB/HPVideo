from fastapi import APIRouter
from fastapi import Depends
from fastapi.responses import StreamingResponse
from utils.utils import get_current_user
from apps.web.models.aimodel import AiModelReq, AiResultReq
from apps.web.models.models import ModelsInstance
from apps.web.models.vipstatus import VIPStatuses
from apps.web.util.userutils import UserUtils
from apps.web.models.conversation import ConversationInstance, ConversationRequest
from apps.web.util.conversationutils import ConversationUtils
from apps.web.ai.wave import WaveApiInstance
from apps.web.models.pay import PayTableInstall
from datetime import date
import time
import json

router = APIRouter()

# @router.post("/completion/video")
# async def completion_video(param: AiModelReq, user=Depends(get_current_user)):
#   def event_generator():
#     # Get the User's Usage Count
#     modelinfo = ModelsInstance.get_info_by_model(param.permodel)
#     # Get the user's VIP records
#     vipStatuss = VIPStatuses.get_vip_status_by_user_id(user.id)
#     # Get the user's current role
#     userrole = UserUtils.checkRole(user)
#     # Get the current date
#     date_time = date.today()
#     # Get the current session data of the current role for non-VIP users
#     conversation = ConversationInstance.get_info_by_user_mtype_date(user.id, userrole, modelinfo.type, date_time)
#     # Get the user's currently available count
#     total = ConversationUtils.checkTotal(userrole, modelinfo.type, vipStatuss)
#     # Get the user's chat count
#     user_total = ConversationUtils.checkUseTotal(user.id, userrole, user.id, modelinfo.type, date_time, vipStatuss, conversation)
#     # Verify the usage count
#     use_num = user_total + 1
#     if conversation is None:
#       ConversationInstance.insert(user.id, userrole, user.id, modelinfo.type, None, use_num)
#     else:
#       conversation.chat_num = use_num
#       ConversationInstance.update(conversation)

#     if (user_total * 2) > total:
#       data = {
#         "success": True,
#         "message": "limit exceeded",
#         "status": 'failed',
#         "limit": {"use": use_num * 2, "total": total},
#         "createId": "",
#         "videos": "limitexceeded"
#       }
#       yield f"data: {json.dumps(data)}\n\n"
#     else:
#       result = WaveApiInstance.create(param)
#       if result is not None and result.get('code') == 200:
#         requestId = result['data']['id']
#         timeout = 0
#         while True:
#           timeout += 1
#           if timeout > 600:
#             data = {
#               "success": True,
#               "message": "timeout",
#               "status": "timeout",
#               "limit": {"use": use_num * 2, "total": total},
#               "createId": requestId,
#               "value": "timeout"
#             }
#             yield f"data: {json.dumps(data)}\n\n"
#             break
#           result = WaveApiInstance.get_prediction_result(requestId)
#           if result.get('success'):
#             outer_data = result.get('data', {})
#             inner_data = outer_data.get('data', {})
#             status = inner_data.get('status', 'unknown')
#             if status == 'completed':
#               data = {
#                 "success": True,
#                 "message": inner_data.get('message', 'success'),
#                 "status": status,
#                 "limit": {"use": use_num * 2, "total": total},
#                 "createId": requestId,
#                 "videos": inner_data.get('outputs', [])
#               }
#               yield f"data: {json.dumps(data)}\n\n"
#               break
#             elif status == 'failed':
#               data = {
#                 "success": True,
#                 "message": inner_data.get('message', 'success'),
#                 "status": status,
#                 "limit": {"use": use_num * 2, "total": total},
#                 "createId": requestId,
#                 "videos": "queryfailed"
#               }
#               yield f"data: {json.dumps(data)}\n\n"
#               break
#             else:
#               data = {
#                 "success": True,
#                 "message": inner_data.get('message', 'success'),
#                 "status": status,
#                 "limit": {"use": use_num * 2, "total": total},
#                 "createId": requestId,
#                 "videos": "videoloading"
#               }
#               yield f"data: {json.dumps(data)}\n\n"
#           # stop 1s
#           time.sleep(0.2)
#       else:
#         data = {
#           "success": True,
#           "message": "create failed",
#           "status": 'failed',
#           "limit": {"use": use_num * 2, "total": total},
#           "createId": "",
#           "videos": "createfailed"
#         }
#         yield f"data: {json.dumps(data)}\n\n"

#     yield f"data: [DONE]\n\n"

#   return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/completion/video")
async def completion_video(param: AiModelReq, user=Depends(get_current_user)):
  def event_generator():
    timeout = 0
    while True:
      timeout += 1
      if (timeout > 60):
        data = {
          "success": True,
          "message": "paytimeout",
          "status": "paying",
          "limit": {"use": 2, "total": 10},
          "paystatus": False,
          "paymoney": "",
          "createId": "",
          "value": "timeout"
        }
        yield f"data: {json.dumps(data)}\n\n"
        break
      pay = PayTableInstall.get_by_messageid(param.messageid)
      if pay is not None:
        if pay.status:
          data = {
            "success": True,
            "message": "paysuccess",
            "status": "paying",
            "limit": {"use": 2, "total": 10},
            "paystatus": True,
            "paymoney": pay.amount,
            "createId": "",
            "videos": []
          }
          yield f"data: {json.dumps(data)}\n\n"
          break
        else:
          data = {
            "success": True,
            "message": "paystart",
            "status": "paying",
            "limit": {"use": 2, "total": 10},
            "paystatus": False,
            "paymoney": pay.amount,
            "createId": "",
            "videos": []
          }
          yield f"data: {json.dumps(data)}\n\n"
      time.sleep(1)
    if pay.status:
      result = WaveApiInstance.create(param)
      if result is not None and result.get('code') == 200:
        requestId = result['data']['id']
        timeout = 0
        while True:
          timeout += 1
          if timeout > 600:
            data = {
              "success": True,
              "message": "timeout",
              "status": "timeout",
              "limit": {"use": 2, "total": 10},
              "paystatus": True,
              "paymoney": pay.amount,
              "createId": requestId,
              "value": "timeout"
            }
            yield f"data: {json.dumps(data)}\n\n"
            break
          result = WaveApiInstance.get_prediction_result(requestId)
          if result.get('success'):
            outer_data = result.get('data', {})
            inner_data = outer_data.get('data', {})
            status = inner_data.get('status', 'unknown')
            if status == 'completed':
              data = {
                "success": True,
                "message": inner_data.get('message', 'success'),
                "status": status,
                "limit": {"use": 2, "total": 10},
                "paystatus": True,
                "paymoney": pay.amount,
                "createId": requestId,
                "videos": inner_data.get('outputs', [])
              }
              yield f"data: {json.dumps(data)}\n\n"
              break
            elif status == 'failed':
              data = {
                "success": True,
                "message": inner_data.get('message', 'success'),
                "status": status,
                "limit": {"use": 2, "total": 10},
                "paystatus": True,
                "paymoney": pay.amount,
                "createId": requestId,
                "videos": "queryfailed"
              }
              yield f"data: {json.dumps(data)}\n\n"
              break
            else:
              data = {
                "success": True,
                "message": inner_data.get('message', 'success'),
                "status": status,
                "limit": {"use": 2, "total": 10},
                "paystatus": True,
                "paymoney": pay.amount,
                "createId": requestId,
                "videos": "videoloading"
              }
              yield f"data: {json.dumps(data)}\n\n"
            # stop 1s
            time.sleep(0.2)
      else:
        data = {
          "success": True,
          "message": inner_data.get('message', 'success'),
          "status": status,
          "limit": {"use": 2, "total": 10},
          "paystatus": True,
          "paymoney": pay.amount,
          "createId": requestId,
          "videos": "videoloading"
        }
      yield f"data: {json.dumps(data)}\n\n"   
    
    yield f"data: [DONE]\n\n"

  return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/video/result")
async def completion_video(param: AiResultReq, user=Depends(get_current_user)):
  def event_generator():
    timeout = 0
    while True:
      timeout += 1
      if timeout > 600:
        data = {
          "success": True,
          "message": "timeout",
          "status": "timeout",
          "limit": {"use": use_num * 2, "total": total},
          "createId": requestId,
          "value": "timeout"
        }
        yield f"data: {json.dumps(data)}\n\n"
        break
      result = WaveApiInstance.get_prediction_result(param.requestId)
      if result.get('success'):
        outer_data = result.get('data', {})
        inner_data = outer_data.get('data', {})
        status = inner_data.get('status', 'unknown')
        if status == 'completed':
          data = {
            "success": True,
            "message": inner_data.get('message', 'success'),
            "status": status,
            "createId": param.requestId,
            "videos": inner_data.get('outputs', [])
          }
          yield f"data: {json.dumps(data)}\n\n"
          break
        elif status == 'failed':
          data = {
            "success": True,
            "message": inner_data.get('message', 'success'),
            "status": status,
            "createId": param.requestId,
            "videos": "queryfailed"
          }
          yield f"data: {json.dumps(data)}\n\n"
          break
        else:
          data = {
            "success": True,
            "message": inner_data.get('message', 'success'),
            "status": status,
            "createId": param.requestId,
            "videos": "videoloading"
          }
          yield f"data: {json.dumps(data)}\n\n"
      # stop 1s
      time.sleep(0.2)
    
    # finish send
    yield f"data: [DONE]\n\n"

  return StreamingResponse(event_generator(), media_type="text/event-stream")
