/**
 * 将网络图片 URL 转换为 File 对象
 * @param url 图片地址
 * @param filename 文件名 (可选)
 * @returns Promise<File>
 */
export async function urlToFile(url: string, filename: string = 'image.png'): Promise<File> {
  try {
    // 1. fetch 获取二进制数据
    // 注意：这就要求图片服务器 (OSS) 必须允许跨域 (CORS)
    const response = await fetch(url, { mode: 'cors' });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    // 2. 转为 Blob
    const blob = await response.blob();

    // 3. 创建 File 对象
    // 根据 blob.type 自动推断文件后缀，也可以手动指定
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error('Url to File conversion failed:', error);
    throw error;
  }
}
