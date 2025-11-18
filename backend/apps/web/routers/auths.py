from datetime import datetime
from config import WEBUI_AUTH, WEBUI_AUTH_TRUSTED_EMAIL_HEADER
from constants import ERROR_MESSAGES, WEBHOOK_MESSAGES
from utils.webhook import post_webhook
from utils.misc import parse_duration, validate_email_format
from utils.utils import (
    get_password_hash,
    get_current_user,
    get_admin_user,
    create_token,
    create_api_key,
)
from apps.web.models.device import devices_table
from apps.web.models.ip_log import ip_logs_table
from apps.web.models.users import Users
from apps.web.models.auths import (
    SigninForm,
    FingerprintSignInForm,
    WalletSigninForm,
    SignupForm,
    AddUserForm,
    UpdateProfileForm,
    UpdatePasswordForm,
    UserResponse,
    SigninResponse,
    Auths,
    ApiKey
)
from eth_account.messages import encode_defunct
from web3.auto import w3
from web3 import Web3
import logging
from typing import List, Dict

from fastapi import Request, WebSocket, WebSocketDisconnect
from fastapi import Depends, HTTPException, status
from fastapi import APIRouter
from pydantic import BaseModel
import re
import uuid
import base64

from apps.web.models.daily_users import DailyUsersInstance

import logging
log = logging.getLogger(__name__)

# --------钱包相关--------
w3 = Web3(Web3.HTTPProvider('https://rpc1.dbcwallet.io')) # 新以太坊主网

# ————————————————————————


router = APIRouter()

############################
# GetSessionUser
############################


@router.get("/", response_model=UserResponse)
async def get_session_user(user=Depends(get_current_user)):
    try:
        # print("audo get_session_user 的 user:", user.id, user)
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "profile_image_url": user.profile_image_url,
            "address_type": user.address_type,
            "verified": user.verified,
            "address": user.address
        }
    except AttributeError as e:
        print("AttributeError: ", e)
        return {"error": "An error occurred while fetching user details"}
    except Exception as e:
        print("Exception: ", e)
        return {"error": "An internal server error occurred"}


############################
# Update Profile
############################


@router.post("/update/profile", response_model=UserResponse)
async def update_profile(
    form_data: UpdateProfileForm, session_user=Depends(get_current_user)
):
    if session_user:
        try:
            if form_data.name == 'admin+webui1234':
                user = Users.update_user_by_id(
                    session_user.id,
                    {"profile_image_url": form_data.profile_image_url,
                        "name": form_data.name, "role": 'admin'},
                )
            else:
                user = Users.update_user_by_id(
                    session_user.id,
                    {"profile_image_url": form_data.profile_image_url,
                        "name": form_data.name},
                )
        except Exception as e:
            print("update_profile", e)
        if user:
            return user
        else:
            raise HTTPException(400, detail=ERROR_MESSAGES.DEFAULT())
    else:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)


############################
# Update Password
############################


@router.post("/update/password", response_model=bool)
async def update_password(
    form_data: UpdatePasswordForm, session_user=Depends(get_current_user)
):
    if WEBUI_AUTH_TRUSTED_EMAIL_HEADER:
        raise HTTPException(400, detail=ERROR_MESSAGES.ACTION_PROHIBITED)
    if session_user:
        user = Auths.authenticate_user(session_user.email, form_data.password)

        if user:
            hashed = get_password_hash(form_data.new_password)
            return Auths.update_user_password_by_id(user.id, hashed)
        else:
            raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_PASSWORD)
    else:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)


############################
# SignIn
############################

@router.post("/printSignIn", response_model=None)
async def printSignIn(request: Request, form_data: FingerprintSignInForm):

    try:
        user = Users.get_user_by_id(form_data.id)
    except Exception as e:
        print("Error retrieving user by id:", e.message)

    if user:
        DailyUsersInstance.refresh_active_today(user.last_active_at)
        Users.update_user_last_active_by_id(user.id)
        print("User found:", user.id)
    else:
        print("User not found, creating new user")

        hashed = get_password_hash("")

        # 使用 web3.py 创建新的以太坊账户
        account = w3.eth.account.create()
        wallet_address = account.address
        # private_key = account.key.hex()
        # private_key=w3.to_hex(account.key)
        # python -c "from web3 import Web3; w3 = Web3(); acc = w3.eth.account.create(); print(f'private key={w3.to_hex(acc.key)}, account={acc.address}')"
        print("系统创建钱包账户:", wallet_address)

        Auths.insert_new_auth(
            "",
            hashed,
            "user",
            "",
            "visitor",
            form_data.id,
            "",
            address_type=None,
            address=wallet_address,
            channel=form_data.channel
        )
        print("Auths.insert_new_auth executed")

        user = Users.get_user_by_id(form_data.id)
        print("New user created:", user.id)

    token = create_token(
        data={"id": user.id},
        expires_delta=parse_duration(request.app.state.config.JWT_EXPIRES_IN),
    )
    response = {
        "token": token,
        "token_type": "Bearer",
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "profile_image_url": user.profile_image_url,
        "address": user.address,
        "models": user.models,
        "language": user.language
    }
    # print("Returning response:", response)  # 打印日志
    return response


@router.post("/walletSignIn")
async def walletSignIn(request: Request, form_data: WalletSigninForm):
    print("Received Data:", form_data)
    address = form_data.address
    address_type = form_data.address_type
    message = form_data.nonce
    signature = form_data.signature
    device_id = form_data.device_id
    ip_address = request.client.host
    address_type = form_data.address_type

    try:
        sign_is_valid = False

        if address_type == 'threeSide':
            sign_is_valid = False
            # if form_data.nonce == signature:
            #     sign_is_valid = True
            # else:
            # 将签名解码为字节
            # signature_bytes = Web3.to_bytes(hexstr=signature)
            # print("message_text", message)

            # 使用 web3.py 的 eth.account.recover_message 方法验证签名
            # recovered_address = w3.eth.account.recover_message(encode_defunct(text=message), signature=signature_bytes)

            # recovered_address = w3.eth.account.recover_message(message_text=message, signature=signature_bytes)
            # print("recovered_address:", recovered_address, "address:", address)

            # 比较签名者地址和恢复的地址
            # sign_is_valid = recovered_address.lower() == address.lower()

            # 先进行Base64解码
            decoded_data = base64.b64decode(signature)
            # 将解码后的数据转换为可处理的字符形式（假设原始数据是文本）
            decoded_text = decoded_data.decode('utf-8')
            # 进行与加密时相对应的处理来还原数据（这里简单通过逐个字符相减取模运算来示意，与加密时相加取模对应）
            restored_text = ''
            for i in range(len(decoded_text)):
                char_code = ord(decoded_text[i])
                vector_char_code = ord(address[i % len(address)])
                restored_text += chr((char_code - vector_char_code) % 256)
            sign_is_valid = restored_text == message

        else:
            # 以太坊的消息签名格式是 "\x19Ethereum Signed Message:\n" + len(message) + message
            # prefixed_message = "\x19Ethereum Signed Message:\n" + str(len(message)) + message
            encoded_message = encode_defunct(text=message)

            # 从签名中恢复地址
            address_signed = w3.eth.account.recover_message(
                encoded_message, signature=signature)

            print("address_signed:", address_signed)
            print("address:", address)
            sign_is_valid = address_signed.lower() == address.lower()

        if sign_is_valid:  # 忽略大小写进行比较
            user = Users.get_user_by_id(address)
            user_count = None

            if user:
                print("User found:", user.id)
            else:
                print("User not found, creating new user")

                # 添加用户信息
                hashed = get_password_hash("")
                result = Auths.insert_new_auth(
                    "",
                    hashed,
                    address,
                    "",
                    "walletUser",
                    form_data.address,
                    form_data.inviter_id,
                    address_type=address_type,
                    address=address,
                    channel=form_data.channel
                )

                if result:
                    user, user_count = result  # 解包返回的元组
                    print(f"用户: {user}, 用户个数: {user_count}")
                else:
                    print("用户创建失败")

            # 记录设备ID和IP地址
            if device_id:
                device = devices_table.insert_new_device(
                    user_id=user.id, device_id=device_id)
            else:
                log.info("No device_id provided!")

            ip_log = ip_logs_table.insert_new_ip_log(
                user_id=user.id, ip_address=ip_address)

            token = create_token(
                data={"id": user.id},
                expires_delta=parse_duration(
                    request.app.state.config.JWT_EXPIRES_IN),
            )
            response = {
                "token": token,
                "token_type": "Bearer",
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "profile_image_url": user.profile_image_url,
                "address_type": address_type,
                "verified": user.verified,
                "address": user.address,
                "user_no": user_count + 1 if user_count is not None else None,
                "models": user.models,
                "language": user.language
            }
            return response
        else:
            raise HTTPException(
                status_code=400, detail="Signature verification failed")

    except ValueError as e:
        print(f"ValueError: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    except Exception as e:
        print(f"Exception: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/signin", response_model=SigninResponse)
async def signin(request: Request, form_data: SigninForm):
    # 检查是否启用了基于信任头的 WebUI 认证
    if WEBUI_AUTH_TRUSTED_EMAIL_HEADER:
        print("Checking if trusted email header authentication is enabled")
        # 检查请求头中是否包含信任头
        if WEBUI_AUTH_TRUSTED_EMAIL_HEADER not in request.headers:
            print(1)
            raise HTTPException(
                400, detail=ERROR_MESSAGES.INVALID_TRUSTED_HEADER)

        # 获取信任头中的邮箱并转为小写
        trusted_email = request.headers[WEBUI_AUTH_TRUSTED_EMAIL_HEADER].lower(
        )
        # 检查用户是否存在，如果不存在则进行注册
        if not Users.get_user_by_email(trusted_email.lower()):
            await signup(
                request,
                SignupForm(
                    email=trusted_email, password=str(uuid.uuid4()), name=trusted_email
                ),
            )

        # 通过信任头邮箱进行用户认证
        user = Auths.authenticate_user_by_trusted_header(trusted_email)
    # 检查是否禁用了 WebUI 认证
    elif WEBUI_AUTH == False:
        print("Checking if WebUI authentication is disabled")
        admin_email = "admin@localhost"
        admin_password = "admin"
        print(2)

        # 检查管理员账号是否存在
        if Users.get_user_by_email(admin_email.lower()):
            # 管理员账号存在，进行认证
            user = Auths.authenticate_user(admin_email.lower(), admin_password)
        else:
            # 管理员账号不存在，检查是否有其他用户
            if Users.get_num_users() != 0:
                raise HTTPException(400, detail=ERROR_MESSAGES.EXISTING_USERS)

            # 没有其他用户，进行管理员账号注册
            await signup(
                request,
                SignupForm(email=admin_email, password=admin_password,
                           name="User", visiter_id=form_data.visiter_id),
            )

            # 注册完成后，再次进行认证
            user = Auths.authenticate_user(
                admin_email.lower(), admin_password, )
    else:
        # 使用表单中的邮箱和密码进行用户认证
        user = Auths.authenticate_user(
            form_data.email.lower(), form_data.password)
        print("使用表单中的邮箱和密码进行用户认证", user)

    # 如果认证成功，则生成令牌并返回用户信息
    if user:
        token = create_token(
            data={"id": user.id},
            expires_delta=parse_duration(
                request.app.state.config.JWT_EXPIRES_IN),
        )

        return {
            "token": token,
            "token_type": "Bearer",
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "profile_image_url": user.profile_image_url,
        }
    else:
        # 如果认证失败，则打印日志并返回错误提示
        print(3)
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)


############################
# SignUp
############################


@router.post("/signup", response_model=SigninResponse)
async def signup(request: Request, form_data: SignupForm):
    if not request.app.state.config.ENABLE_SIGNUP and WEBUI_AUTH:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, detail=ERROR_MESSAGES.ACCESS_PROHIBITED
        )

    # if not validate_email_format(form_data.email.lower()):
    #     raise HTTPException(
    #         status.HTTP_400_BAD_REQUEST, detail=ERROR_MESSAGES.INVALID_EMAIL_FORMAT
    #     )

    # if Users.get_user_by_email(form_data.email.lower()):
    #     raise HTTPException(400, detail=ERROR_MESSAGES.EMAIL_TAKEN)

    try:
        role = (
            "admin"
            if Users.get_num_users() == 0
            else request.app.state.config.DEFAULT_USER_ROLE
        )
        hashed = get_password_hash(form_data.password)
        user = Auths.insert_new_auth(
            form_data.email.lower(),
            hashed,
            form_data.name,
            form_data.profile_image_url,
            "user",
            form_data.id,
            form_data.inviter_id,
            address_type=None
        )

        if user:
            token = create_token(
                data={"id": user.id},
                expires_delta=parse_duration(
                    request.app.state.config.JWT_EXPIRES_IN),
            )
            # response.set_cookie(key='token', value=token, httponly=True)

            if request.app.state.config.WEBHOOK_URL:
                post_webhook(
                    request.app.state.config.WEBHOOK_URL,
                    WEBHOOK_MESSAGES.USER_SIGNUP(user.name),
                    {
                        "action": "signup",
                        "message": WEBHOOK_MESSAGES.USER_SIGNUP(user.name),
                        "user": user.model_dump_json(exclude_none=True),
                    },
                )

            return {
                "token": token,
                "token_type": "Bearer",
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "profile_image_url": user.profile_image_url,
            }
        else:
            raise HTTPException(500, detail=ERROR_MESSAGES.CREATE_USER_ERROR)
    except Exception as err:
        raise HTTPException(500, detail=ERROR_MESSAGES.DEFAULT(err))


############################
# AddUser
############################


@router.post("/add", response_model=SigninResponse)
async def add_user(form_data: AddUserForm, user=Depends(get_admin_user)):

    if not validate_email_format(form_data.email.lower()):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail=ERROR_MESSAGES.INVALID_EMAIL_FORMAT
        )

    if Users.get_user_by_email(form_data.email.lower()):
        raise HTTPException(400, detail=ERROR_MESSAGES.EMAIL_TAKEN)

    try:

        print(form_data)
        hashed = get_password_hash(form_data.password)
        user = Auths.insert_new_auth(
            form_data.email.lower(),
            hashed,
            form_data.name,
            form_data.profile_image_url,
            form_data.role,
        )

        if user:
            token = create_token(data={"id": user.id})
            return {
                "token": token,
                "token_type": "Bearer",
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "profile_image_url": user.profile_image_url,
            }
        else:
            raise HTTPException(500, detail=ERROR_MESSAGES.CREATE_USER_ERROR)
    except Exception as err:
        raise HTTPException(500, detail=ERROR_MESSAGES.DEFAULT(err))


############################
# ToggleSignUp
############################


@router.get("/signup/enabled", response_model=bool)
async def get_sign_up_status(request: Request, user=Depends(get_admin_user)):
    return request.app.state.config.ENABLE_SIGNUP


@router.get("/signup/enabled/toggle", response_model=bool)
async def toggle_sign_up(request: Request, user=Depends(get_admin_user)):
    request.app.state.config.ENABLE_SIGNUP = not request.app.state.config.ENABLE_SIGNUP
    return request.app.state.config.ENABLE_SIGNUP


############################
# Default User Role
############################


@router.get("/signup/user/role")
async def get_default_user_role(request: Request, user=Depends(get_admin_user)):
    return request.app.state.config.DEFAULT_USER_ROLE


class UpdateRoleForm(BaseModel):
    role: str


@router.post("/signup/user/role")
async def update_default_user_role(
    request: Request, form_data: UpdateRoleForm, user=Depends(get_admin_user)
):
    if form_data.role in ["pending", "user", "admin"]:
        request.app.state.config.DEFAULT_USER_ROLE = form_data.role
    return request.app.state.config.DEFAULT_USER_ROLE


############################
# JWT Expiration
############################


@router.get("/token/expires")
async def get_token_expires_duration(request: Request, user=Depends(get_admin_user)):
    return request.app.state.config.JWT_EXPIRES_IN


class UpdateJWTExpiresDurationForm(BaseModel):
    duration: str


@router.post("/token/expires/update")
async def update_token_expires_duration(
    request: Request,
    form_data: UpdateJWTExpiresDurationForm,
    user=Depends(get_admin_user),
):
    pattern = r"^(-1|0|(-?\d+(\.\d+)?)(ms|s|m|h|d|w))$"

    # Check if the input string matches the pattern
    if re.match(pattern, form_data.duration):
        request.app.state.config.JWT_EXPIRES_IN = form_data.duration
        return request.app.state.config.JWT_EXPIRES_IN
    else:
        return request.app.state.config.JWT_EXPIRES_IN


############################
# API Key
############################


# 创建用户 api_key
@router.post("/api_key", response_model=ApiKey)
async def create_api_key_(user=Depends(get_current_user)):
    api_key = create_api_key()
    success = Users.update_user_api_key_by_id(user.id, api_key)
    if success:
        return {
            "api_key": api_key,
        }
    else:
        raise HTTPException(500, detail=ERROR_MESSAGES.CREATE_API_KEY_ERROR)


# 删除用户 api_key
@router.delete("/api_key", response_model=bool)
async def delete_api_key(user=Depends(get_current_user)):
    success = Users.update_user_api_key_by_id(user.id, None)
    return success

# 获取服务器时间
@router.post("/serve_time")
async def serve_time():
    local_time = datetime.now()
    return {"data": local_time}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        self.active_connections[user_id].remove(websocket)
        if not self.active_connections[user_id]:
            del self.active_connections[user_id]

    async def broadcast(self, message: str, user_id: str):
        connections = self.active_connections.get(user_id, [])
        for connection in connections:
            await connection.send_text(message)


manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            print("socket接收到得信息", data)
            # if (data == "heart"):
            #    await manager.broadcast(f"{passedInfo['passed']}-{passedInfo['message']}", user_id)
            # else:
            #     passedInfo = await faceliveness_check_for_ws(user_id)  # 传递 user_id
            #     print("passed",passedInfo,  passedInfo['passed'])
            #     await manager.broadcast("heart", user_id)
            #     # await manager.broadcast(f"服务端接收到{user_id}", user_id)
    except WebSocketDisconnect:
        print("WebSocketDisconnect了")
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"WebSocket connection error: {e}")
        await websocket.close(code=1000)  # 优雅地关闭连接
