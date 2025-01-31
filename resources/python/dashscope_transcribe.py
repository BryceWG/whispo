import sys
import json
import os
from dashscope import MultiModalConversation

def transcribe_audio(file_path: str, api_key: str, model: str = "qwen-audio-asr") -> dict:
    """
    使用 DashScope 的 Python SDK 进行转录
    """
    try:
        # 设置 API Key
        MultiModalConversation.api_key = api_key

        # 准备消息
        messages = [
            {
                "role": "user",
                "content": [{"audio": f"file://{file_path}"}],
            }
        ]

        # 调用转录
        response = MultiModalConversation.call(model=model, messages=messages)

        # 检查响应
        if response.status_code == 200:
            # 从响应中提取文本
            text = response.output.choices[0].message.content
            return {
                "success": True,
                "text": text,
                "error": None
            }
        else:
            return {
                "success": False,
                "text": None,
                "error": f"API Error: {response.code} - {response.message}"
            }
    except Exception as e:
        return {
            "success": False,
            "text": None,
            "error": str(e)
        }

if __name__ == "__main__":
    # 从命令行参数获取配置
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "text": None,
            "error": "Missing required arguments: file_path api_key [model]"
        }))
        sys.exit(1)

    input_file = sys.argv[1]
    api_key = sys.argv[2]
    model = sys.argv[3] if len(sys.argv) > 3 else "qwen-audio-asr"
    
    # 执行转录
    result = transcribe_audio(input_file, api_key, model)
    
    # 输出 JSON 结果
    print(json.dumps(result)) 