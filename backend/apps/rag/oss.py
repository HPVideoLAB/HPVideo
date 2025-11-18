import oss2
import base64
import os
import uuid
import datetime

# Configure the access key and endpoint
access_key_id = os.getenv("FILE_ACCESS_KEY_ID")
access_key_secret = os.getenv("FILE_ACCESS_KEY_SECRET")
endpoint = os.getenv("FILE_ENDPOINT")
bucket_name = os.getenv("FILE_BUCKET_NAME")
oss_url = os.getenv("FILE_OSS_URL")

class OssUtil:
    def __init__(self):
        # Create a Bucket object
        auth = oss2.Auth(access_key_id, access_key_secret)
        self.bucket = oss2.Bucket(auth, endpoint, bucket_name)

    def upload_base64_to_oss(self, base64_str):
        try:
            # Get the current date
            now = datetime.datetime.now()
            # Format as Year/Month/Day
            formatted_date = now.strftime('%Y/%m/%d')
            file_name = f'{formatted_date}/image_{uuid.uuid4()}.png'

            # Check and clean the Base64 prefix
            if ',' in base64_str:
                base64_str = base64_str.split(',')[1]
            
            # Decode the Base64 string
            image_data = base64.b64decode(base64_str)
            
            # Upload to OSS
            result = self.bucket.put_object(
                file_name,
                image_data,
                headers={'Content-Type': 'image/png'}
            )
            
            if result.status == 200:
                return f"{oss_url}{file_name}"
            else:
                return None
        except Exception as e:
            print("==========Oss Upload Error==========:", e)
            return None
      
    def upload_file_to_oss(self, local_file, file_ext):
        try:
            #  Get the current date
            now = datetime.datetime.now()
            # Format as Year/Month/Day
            formatted_date = now.strftime('%Y/%m/%d')
            file_name = f'{formatted_date}/file_{uuid.uuid4()}.{file_ext}'
            
            # Upload to OSS
            result = self.bucket.put_object_from_file(file_name, local_file)
            
            if result.status == 200:
                return f"{oss_url}{file_name}"
            else:
                return None
        except Exception as e:
            print("==========Oss Upload Error==========:", e)
            return None

    
OSSUtil = OssUtil()