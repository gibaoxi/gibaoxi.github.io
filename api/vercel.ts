// 1. 彻底移除第一行的 import { serve }，Vercel 边缘函数不需要它

const userID = Deno.env.get('UUID') || '';
// 如果你的域名是 yybin.vercel.app，建议在环境变量里填这个
const validHost = Deno.env.get('DOMAIN') || ''; 

export default async (req: Request): Promise<Response> => {
  const host = req.headers.get('host') || '';
  const upgrade = req.headers.get('upgrade') || '';

  // 2. 域名验证
  // 注意：如果你通过 /api/vercel 路径访问，host 验证通常是对的
  if (validHost && host !== validHost) {
    return new Response('Not Found', { status: 404 });
  }

  // 3. 只有 WebSocket 握手才进入转发逻辑
  if (upgrade.toLowerCase() === 'websocket') {
    // @ts-ignore: 规避 Vercel 环境编译检查
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // 使用 any 规避 Deno.TcpConn 在某些版本 std 库缺失的问题
    let remoteConnection: any;

    socket.onmessage = async (e: MessageEvent) => {
      try {
        if (!(e.data instanceof ArrayBuffer)) return;
        const vlessBuffer: ArrayBuffer = e.data;

        if (remoteConnection) {
          await remoteConnection.write(new Uint8Array(vlessBuffer));
        } else {
          // Vless 协议解析开始
          if (vlessBuffer.byteLength < 24) return;

          const version = new Uint8Array(vlessBuffer.slice(0, 1));
          const v_uuid = Array.from(new Uint8Array(vlessBuffer.slice(1, 17)))
                          .map(b => b.toString(16).padStart(2, '0')).join('');
          const formatted_uuid = `${v_uuid.slice(0,8)}-${v_uuid.slice(8,12)}-${v_uuid.slice(12,16)}-${v_uuid.slice(16,20)}-${v_uuid.slice(20)}`;

          if (formatted_uuid !== userID) {
            socket.close();
            return;
          }

          const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];
          const command = new Uint8Array(vlessBuffer.slice(18 + optLength, 18 + optLength + 1))[0];

          if (command !== 1) { 
            socket.close();
            return;
          }

          const portIndex = 18 + optLength + 1;
          const port = new DataView(vlessBuffer.slice(portIndex, portIndex + 2)).getUint16(0);

          let addressIndex = portIndex + 2;
          const addressType = new Uint8Array(vlessBuffer.slice(addressIndex, addressIndex + 1))[0];
          let addressValue = '';
          let addressLength = 0;
          let addressValueIndex = addressIndex + 1;

          if (addressType === 1) { 
            addressLength = 4;
            addressValue = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join('.');
          } else if (addressType === 2) { 
            addressLength = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
            addressValueIndex += 1;
            addressValue = new TextDecoder().decode(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
          }

          // 连接目标服务器
          // @ts-ignore
          remoteConnection = await Deno.connect({ port: port, hostname: addressValue });

          const rawDataIndex = addressValueIndex + addressLength;
          const rawClientData = vlessBuffer.slice(rawDataIndex);
          if (rawClientData.byteLength > 0) {
            await remoteConnection.write(new Uint8Array(rawClientData));
          }

          const responseHeader = new Uint8Array([version[0], 0]);

          remoteConnection.readable.pipeTo(new WritableStream({
            start() {
              socket.send(new Blob([responseHeader]));
            },
            write(chunk) {
              socket.send(new Blob([chunk]));
            }
          })).catch(() => {
            socket.close();
          });
        }
      } catch (error) {
        socket.close();
      }
    };

    socket.onclose = () => remoteConnection?.close();
    socket.onerror = () => remoteConnection?.close();

    return response;
  }

  // 4. 如果不是 WS 请求，返回伪装的 404 页面
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head><title>404 Not Found</title></head>
      <body style="font-family:sans-serif;padding:50px;">
        <h1>404 Not Found</h1>
        <hr><p>nginx/1.21.6</p>
      </body>
    </html>`, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
};