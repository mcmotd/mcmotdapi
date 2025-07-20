import requests
import threading
import time
import psutil
import matplotlib.pyplot as plt
from datetime import datetime
from tqdm import tqdm

# 配置参数
TARGET_URL = "http://localhost:3123/api/iframe_img?ip=127.0.0.1&port=19132"
CONCURRENT_THREADS = 3  # 并发线程数
REQUEST_COUNT = int(150/CONCURRENT_THREADS)     # 每个线程的请求次数
MONITOR_DURATION = -1  # 监控持续时间(秒)
LOG_INTERVAL = 5        # 进度日志间隔(秒)

# 全局状态
test_stats = {
    'success': 0,
    'failure': 0,
    'start_time': time.time(),
    'last_log': time.time(),
    'memory': [],
    'timestamps': [],
    'progress': 0,
    'running': True
}

def make_request(thread_id):
    for _ in range(REQUEST_COUNT):
        try:
            response = requests.get(TARGET_URL, timeout=10)
            if response.status_code == 200:
                test_stats['success'] += 1
            else:
                test_stats['failure'] += 1
        except Exception as e:
            test_stats['failure'] += 1
        
        test_stats['progress'] += 1
        
        # 每10个请求做一次短暂暂停
        if test_stats['progress'] % 10 == 0:
            time.sleep(0.1)

def monitor_memory():
    node_pid = None
    # 精确查找Node进程
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        if 'node' in proc.info['name'].lower():
            node_pid = proc.info['pid']
            break
    
    while test_stats['running']:
        try:
            if node_pid:
                proc = psutil.Process(node_pid)
                mem_info = proc.memory_info()
                test_stats['memory'].append(mem_info.rss / (1024 * 1024))
                test_stats['timestamps'].append(time.time() - test_stats['start_time'])
            
            # 定期进度报告
            if time.time() - test_stats['last_log'] > LOG_INTERVAL:
                elapsed = time.time() - test_stats['start_time']
                req_per_sec = test_stats['progress'] / max(1, elapsed)
                print(
                    f"\n[进度] {test_stats['progress']}/{CONCURRENT_THREADS*REQUEST_COUNT} "
                    f"({(test_stats['progress']/(CONCURRENT_THREADS*REQUEST_COUNT)*100):.1f}%) "
                    f"| 成功率: {(test_stats['success']/max(1, test_stats['progress'])*100):.1f}% "
                    f"| 速度: {req_per_sec:.1f} req/s"
                )
                test_stats['last_log'] = time.time()
            
            time.sleep(1)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            time.sleep(5)

def run_test():
    print(f"\n🏁 开始压力测试 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔗 目标URL: {TARGET_URL}")
    print(f"🧵 并发线程: {CONCURRENT_THREADS}")
    print(f"🔄 每线程请求: {REQUEST_COUNT}")
    print(f"🎯 总请求量: {CONCURRENT_THREADS * REQUEST_COUNT}")
    print(f"⏱️ 最长持续时间: {MONITOR_DURATION}秒\n")
    
    # 启动监控线程
    monitor_thread = threading.Thread(target=monitor_memory)
    monitor_thread.daemon = True
    monitor_thread.start()
    
    # 创建并启动工作线程
    threads = []
    for i in range(CONCURRENT_THREADS):
        t = threading.Thread(target=make_request, args=(i+1,))
        threads.append(t)
        t.start()
    
    # 进度条显示
    with tqdm(total=CONCURRENT_THREADS*REQUEST_COUNT, desc="测试进度") as pbar:
        while test_stats['progress'] < CONCURRENT_THREADS*REQUEST_COUNT:
            pbar.n = test_stats['progress']
            pbar.refresh()
            time.sleep(0.5)
    
    # 等待线程完成
    for t in threads:
        t.join(timeout=1)
    
    test_stats['running'] = False
    monitor_thread.join(timeout=1)
    
    # 结果分析
    total = test_stats['success'] + test_stats['failure']
    elapsed = time.time() - test_stats['start_time']
    req_per_sec = total / elapsed
    
    print("\n✅ 测试完成!")
    print(f"⏱️ 总耗时: {elapsed:.2f}秒")
    print(f"📊 总请求: {total}")
    print(f"🟢 成功: {test_stats['success']} ({(test_stats['success']/total*100):.1f}%)")
    print(f"🔴 失败: {test_stats['failure']} ({(test_stats['failure']/total*100):.1f}%)")
    print(f"⚡ 平均吞吐量: {req_per_sec:.1f} 请求/秒")
    
    # 生成内存报告
    if test_stats['memory']:
        plt.figure(figsize=(12, 6))
        plt.plot(test_stats['timestamps'], test_stats['memory'])
        plt.title(f'Memory Usage (Peak: {max(test_stats['memory']):.1f}MB)')
        plt.xlabel('Time (seconds)')
        plt.ylabel('Memory (MB)')
        plt.grid(True)
        
        # 标记关键点
        max_idx = test_stats['memory'].index(max(test_stats['memory']))
        plt.annotate(
            f'Peak: {max(test_stats['memory']):.1f}MB',
            xy=(test_stats['timestamps'][max_idx], max(test_stats['memory'])),
            xytext=(10, 10), textcoords='offset points',
            arrowprops=dict(arrowstyle='->')
        )
        
        plt.savefig('memory_usage.png', dpi=150, bbox_inches='tight')
        print("\n📈 内存使用图表已保存: memory_usage.png")

if __name__ == "__main__":
    run_test()