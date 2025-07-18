// server/api/status.js

export default defineEventHandler(async (event) => {
  // 模拟一个固定响应，不进行任何外部网络请求
  const mockServerData = {
    type: 'Java',
    status: 'online',
    host: 'mock.server.com:25565',
    motd: {
      "extra": [
        { "color": "gray", "text": "欢迎来到 " },
        { "color": "gold", "text": "模拟服务器" },
        { "color": "gray", "text": "!\n" },
        { "color": "aqua", "text": "这是一个离线演示" }
      ],
      "text": "欢迎来到模拟服务器!\n这是一个离线演示"
    },
    motd_html: '<span class="color-7">欢迎来到 </span><span class="color-6">模拟服务器</span><span class="color-7">!<br><span class="color-b">这是一个离线演示</span>',
    version: '1.20.1',
    protocol: 763,
    players: {
      online: 42,
      max: 100,
      sample: 'Player1, Player2, Player3'
    },
    mod_info: {
      type: 'FML',
      modList: [
        { modid: 'mockmod1', version: '1.0' },
        { modid: 'mockmod2', version: '2.1' }
      ]
    },
    icon: null,
    delay: 50
  };

  await new Promise(resolve => setTimeout(resolve, 500));

  // 返回数据给接口
  return mockServerData;
});
