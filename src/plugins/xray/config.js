/**
 * 禁止修改的变量
 * 下列变量为程序所用，错误配置将导致本插件无法正常运行
 */

// 本插件的所有数据存放目录
export const PLUGIN_DATA_DIR = './data/xray/'

// 直连列表
export const DIRECT_FILE = PLUGIN_DATA_DIR + 'direct.list'

// 代理列表
export const PROXY_FILE = PLUGIN_DATA_DIR + 'proxy.list'

// 拦截列表
export const BLOCK_FILE = PLUGIN_DATA_DIR + 'block.list'

// 分流文件
export const ROUTES_FILE = PLUGIN_DATA_DIR + 'routes.json'

// 订阅列表
export const SUBSCRIBES_FILE = PLUGIN_DATA_DIR + 'subscribes.json'

// 节点列表
export const NODES_FILE = PLUGIN_DATA_DIR + 'nodes.json'

// xray配置模板文件
export const TEMPLATE_FILE = './src/plugins/xray/template.json'


/**
 * 必须修改的变量
 * 根据自己系统修改，错误配置将导致本插件无法正常运行
 */

// 你的xray服务名称
export const SERVICE_NAME = 'xray.service'

// 你的xray可执行文件
export const XRAY_FILE = '/usr/local/bin/xray'

// 你的xray配置文件
export const XRAY_CONFIG_FILE = '/usr/local/etc/xray/config.json'


/**
 * 建议修改的变量
 * 根据自己网络带宽进行修改
 */

// 测速文件链接
export const SPEEDTEST_URL = 'http://http.speed.hinet.net/test_015m.zip'

// 测速文件大小
export const SPEEDTEST_URL_SIZE = 15000

// 测延迟链接
export const DELAYTEST_URL = 'http://www.gstatic.com/generate_204'

/**
 * 依据偏好修改的变量
 */

// 替换节点中的关键词
export const REPLACE_KEYWORDS = {
    '韩国': '思密达'
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
