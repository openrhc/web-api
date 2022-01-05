
// 你的xray可执行文件路径
export const XRAY_PATH = '/usr/local/bin/xray'

// 你的xray服务名称
export const SERVICE_NAME = 'xray.service'

// 你的xray配置文件存放路径
export const XRAY_CONFIG_PATH = '/usr/local/etc/xray/config.json'

// xray配置模板文件
export const TEMPLATE_FILE = './src/plugins/xray/template.json'

// 测速文件
export const SPEEDTEST_FILE = 'http://http.speed.hinet.net/test_015m.zip'

// 测速文件大小
export const SPEEDTEST_FILE_SIZE = 15000

// 替换节点中的关键词
export const REPLACE_KEYWORDS = {
    'github.com/freefq - ': ''
};

// 不添加包含以下关键词的节点
export const EXCLUDE_KEYWORDS = [
    '.com',
    '已禁',
    '严禁',
    '定期更新',
    'Telegram',
    '更新于',
    '剩余流量',
    '过期时间',
    '狮城',
    '首尔',
    '圣荷西'
];

// 不添加以下协议的节点，参考值：'Shadowsocks', 'Trojan', 'VMess',
export const EXCLUDE_PROTOCOL = ['Shadowsocks', 'Trojan'];

// 当节点不可用时，将以什么样的方式选择下一个节点，参考值：0 - 线性选择， 其他 - 随机选择
export const SWITCH_PROXY_METHOD = 2;
