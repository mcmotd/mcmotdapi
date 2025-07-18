const PingMCServer = require("./java").fetch;
const ping = require('mcpe-ping');
const logger = spark.getLogger('motd')
const msgbuilder = require('../../handles/msgbuilder');//导入信息构建函数

logger.info("插件已加载，使用motd/motdpe <ip:端口> 来查询je/be服务器");
let group = spark.mc.config.group.main;

spark.on('message.group.normal', (e,reply) => {
    if (e.group !== group) return;
    if (e.raw_message.startsWith('motdpe') || e.raw_message.startsWith('motd')) {
        let splits = e.raw_message.split(' ');
        let address = splits[1];
        let port = 19132;
        splits[0] == 'motd' ? port = 25565 : port = 19132;
        splits[0] == 'motdpe'
        try{
            if (address.includes(":")) {
                port = Number(address.split(':')[1]);
                address = address.split(':')[0];
                if (isNaN(port)) {
                    reply('使用的地址参数不合法');
                    return;
                }
            }
        }catch{return;}
        logger.info('正在查询：'+address+':'+ port);
        let now = new Date().getTime();
        if (splits[0] == 'motdpe') {
            ping(address, port, (err, res) => {
                if (err) {
                    reply('远程服务器不在线',true)
                } else {
                    try {
                        const { cleanName, maxPlayers, currentPlayers, version } = res;
                        reply(`[基岩版服务器查询]\n服务器描述：${cleanName}\n版本：${version}\n在线人数：${currentPlayers}/${maxPlayers}\n延迟：${new Date().getTime() - now}`,true);
                    } catch (erer) {
                        reply("查询出错了！" + erer.toString(),true);
                    }
                }
            })
        } else {
            PingMCServer(address, port).then(res => {
                try {
                    const { version, description, players, favicon, modinfo } = res;
                    //console.log(res);
                    let send = ['Java版服务器查询',`服务器描述：${typeof description == 'string' ? description : description.text ?? description.translate}\n版本：${version.name}\n协议版本：${version.protocol}\n在线人数：${players.online}/${players.max}\n在线列表：${players.sample.map((i) => { return i.name }).join(',')}\n延迟：${new Date().getTime() - now}`];
                    if (favicon) {
                        send.push(msgbuilder.img('base64://' + favicon.split(',')[1]));
                    }
                    if (modinfo) {
                        send.push('\nmod数量：' + modinfo.modList.length)
                    }
                    reply(send,true);
                } catch (erer) {
                    reply("查询出错了！" + erer.toString(),true);
                }
            }).catch(err => {
                console.log(err);
                reply('远程服务器不在线',true);
            })
        }
    }
});