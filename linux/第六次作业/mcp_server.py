from fastmcp import FastMCP
from datetime import datetime

# 创建 MCP 服务，名称可以随便起
mcp = FastMCP("HomeworkServer")

# ----------------------------------------------
# 工具2：返回 token（不需要鉴权）
# ----------------------------------------------
@mcp.tool()
def get_token() -> str:
    """返回鉴权所需的 token（无需任何凭证）"""
    # 这里我们使用一个固定的 token，实际你也可以动态生成
    return "homework-token-123456"
    print("工具 get_token 已注册")
# ----------------------------------------------
# 工具1：需要鉴权的自定义功能
# ----------------------------------------------
@mcp.tool()
def get_server_time(token: str) -> str:
    """
    返回服务器的当前时间（需要鉴权）。
    参数 token：从 get_token() 获取的令牌
    """
    # 鉴权逻辑：检查 token 是否正确
    if token != "homework-token-123456":
        return "错误：无效的 token，请先调用 get_token 获取有效令牌"

    # 自定义功能：返回当前时间
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return f"服务器当前时间：{now}"


# ----------------------------------------------
# 启动服务
# ----------------------------------------------
if __name__ == "__main__":
    # 监听所有网卡，端口 8000，使用 SSE 传输
    mcp.run(transport="sse", host="0.0.0.0", port=8000)
