import { defineStore } from 'pinia';
import { getMinecraftServerInfo } from '../api/server';
import { parseMotdToHtml } from '../utils/motd-parser';


export const useAppStore = defineStore('app', {
    state: () => ({
        serverInfo: {},
        starCount: 'N/A',
        isQuerying: false,
        queryError: false,
        queryStatusMessage: '',
    }),

    actions: {
        async queryMinecraftServer(ip, port) {
            this.isQuerying = true;
            this.queryError = false;
            this.queryStatusMessage = '正在从API获取服务器信息...';
            this.serverInfo = {};

            try {
                const backendResponse = await getMinecraftServerInfo(ip, port);
                const motdAsHtml = parseMotdToHtml(backendResponse.motd);

                // [核心修改] 扩展这个对象，包含所有需要的数据
                const formattedResponse = {
                    // 原有字段
                    name: backendResponse.host,
                    ip: backendResponse.host,
                    players: {
                        online: backendResponse.online,
                        max: backendResponse.max,
                    },
                    version: backendResponse.version,
                    motd: motdAsHtml,

                    // 新增字段，用于新设计
                    agreement: backendResponse.agreement, // 协议号
                    gamemode: backendResponse.gamemode,   // 游戏模式
                    status: backendResponse.status,       // 服务器状态
                    delay: backendResponse.delay,         // 延迟
                };

                this.serverInfo = formattedResponse;

            } catch (error) {
                console.error("查询失败:", error);
                this.queryError = true;
                this.queryStatusMessage = `无法查询到任何信息。`;
            } finally {
                this.isQuerying = false;
            }
        },

        // fetchStarCount 保持不变
        async fetchStarCount() {
            try {
                setTimeout(() => { this.starCount = '1.2k'; }, 1000);
            } catch (error) {
                console.error('获取Star数失败:', error);
                this.starCount = '获取失败';
            }
        },
    },
});