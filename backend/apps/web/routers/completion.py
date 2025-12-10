from fastapi import APIRouter
from fastapi import Depends
from fastapi.responses import StreamingResponse
from utils.utils import get_current_user
from apps.web.models.aimodel import AiModelReq, AiResultReq
from apps.web.ai.wave import WaveApiInstance
from apps.web.models.pay import PayTableInstall
import time
import json

router = APIRouter()

@router.post("/completion/video")
async def completion_video(param: AiModelReq, user=Depends(get_current_user)):
  def event_generator():
    pay = PayTableInstall.get_by_messageid(param.messageid)
    if pay.status:
      data = {
        "success": True,
        "message": "pay success",
        "status": "creating",
        "limit": {"use": 2, "total": 10},
        "paystatus": True,
        "paymoney": pay.amount,
        "createId": "",
        "videos": "paid"
      }
      yield f"data: {json.dumps(data)}\n\n"

      result = WaveApiInstance.create(param)
      if result is not None and result.get('code') == 200:
        requestId = result['data']['id']
        timeout = 0
        while True:
          timeout += 1
          if timeout > 300:
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
          time.sleep(1)  
      else:
        data = {
          "success": True,
          "message": "create failed",
          "status": 'failed',
          "limit": {"use": 2, "total": 10},
          "paystatus": True,
          "paymoney": pay.amount,
          "createId": "",
          "videos": "createdfailed"
        }
        yield f"data: {json.dumps(data)}\n\n"
    
    yield f"data: [DONE]\n\n"

  return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/video/result")
async def completion_video(param: AiModelReq, user=Depends(get_current_user)):
  def event_generator():
    failednum = 0
    timeout = 0
    while True:
      timeout += 1
      if timeout > 600:
        data = {
          "success": True,
          "message": "timeout",
          "status": "timeout",
          "limit": {"use": 2, "total": 10},
          "createId": param.requestId,
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
          failednum += 1
          if failednum == 3:
            result = WaveApiInstance.create(param)
            if result is not None and result.get('code') == 200:
              param.requestId = result['data']['id']
          if failednum <= 3:
            data = {
              "success": True,
              "message": inner_data.get('message', 'success'),
              "status": "processing",
              "createId": param.requestId,
              "videos": "videoloading"
            }
            yield f"data: {json.dumps(data)}\n\n"
          else:
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
          failednum = 0
          data = {
            "success": True,
            "message": inner_data.get('message', 'success'),
            "status": status,
            "createId": param.requestId,
            "videos": "videoloading"
          }
          yield f"data: {json.dumps(data)}\n\n"
      # stop 0.5s
      time.sleep(0.5)
    
    # finish send
    yield f"data: [DONE]\n\n"

  return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/video/x402/result")
async def completion_video(param: AiResultReq):
  def event_generator():
    timeout = 0
    while True:
      timeout += 1
      if timeout > 600:
        data = {
          "success": True,
          "message": "timeout",
          "status": "timeout",
          "limit": {"use": 2, "total": 10},
          "createId": param.requestId,
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
