/**
 * Sub-store 订阅转换脚本
 *
 * - loadbalance: 启用负载均衡 (false)
 * - landing: 启用落地节点功能 (false)
 * - ipv6: 启用 IPv6 支持 (false)
 * - full: 启用完整配置 (false)
 * - keepalive: 启用 tcp-keep-alive (false)
 */

const inArg = typeof $arguments !== "undefined" ? $arguments : {};
const loadBalance = parseBool(inArg.loadbalance) || false,
  landing = parseBool(inArg.landing) || false,
  ipv6Enabled = parseBool(inArg.ipv6) || false,
  fullConfig = parseBool(inArg.full) || false,
  keepAliveEnabled = parseBool(inArg.keepalive) || false;

function buildBaseLists({ landing, lowCost, IPv6Node, countryInfo }) {
  const countryGroupNames = countryInfo
    .filter((item) => item.count > 2)
    .map((item) => item.country + "节点");

  // defaultSelector (节点选择 组里展示的候选)
  // 故障转移, 落地节点(可选), 各地区节点, 低倍率(可选), 手动切换, DIRECT
  const selector = ["故障转移"]; // 把 fallback 放在最前
  if (landing) selector.push("落地节点");
  selector.push(...countryGroupNames);
  if (lowCost) selector.push("低倍率");
  if (IPv6Node) selector.push("IPv6");
  selector.push("手动切换", "DIRECT");

  // defaultProxies (各分类策略引用)
  // 节点选择, 各地区节点, 低倍率(可选), 手动切换, 直连
  const defaultProxies = ["节点选择", ...countryGroupNames];
  if (lowCost) defaultProxies.push("低倍率");
  if (IPv6Node) defaultProxies.push("IPv6");
  defaultProxies.push("手动切换", "直连");

  // direct 优先的列表
  const defaultProxiesDirect = [
    "直连",
    ...countryGroupNames,
    "节点选择",
    "手动切换",
  ]; // 直连优先
  if (lowCost) {
    // 在直连策略里低倍率次于地区、早于节点选择
    defaultProxiesDirect.splice(1 + countryGroupNames.length, 0, "低倍率");
  }

  const defaultFallback = [];
  if (landing) defaultFallback.push("落地节点");
  defaultFallback.push(...countryGroupNames);
  if (lowCost) defaultFallback.push("低倍率");
  // 可选是否加入 手动切换 / DIRECT；按容灾语义加入。
  defaultFallback.push("手动切换", "DIRECT");

  return {
    defaultProxies,
    defaultProxiesDirect,
    defaultSelector: selector,
    defaultFallback,
    countryGroupNames,
  };
}

const ruleProviders = {
  LAN: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Lan/Lan.list",
    path: "./ruleset/LAN.list",
  },
  ADBlock: {
    type: "http",
    behavior: "domain",
    format: "text",
    interval: 86400,
    url: "https://adrules.top/adrules_domainset.txt",
    path: "./ruleset/ADBlock.txt",
  },
  BanProgramAD: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://fastly.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/BanProgramAD.list",
    path: "./ruleset/BanProgramAD.txt",
  },
  ZhihuADs: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/ZhihuADs/ZhihuADs.list",
    path: "./ruleset/ZhihuADs.txt",
  },
  StaticResources: {
    type: "http",
    behavior: "domain",
    format: "text",
    interval: 86400,
    url: "https://ruleset.skk.moe/Clash/domainset/cdn.txt",
    path: "./ruleset/StaticResources.txt",
  },
  CDNResources: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://ruleset.skk.moe/Clash/non_ip/cdn.txt",
    path: "./ruleset/CDNResources.txt",
  },
  AI: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://ruleset.skk.moe/Clash/non_ip/ai.txt",
    path: "./ruleset/AI.txt",
  },
  TikTok: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://fastly.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/TikTok.list",
    path: "./ruleset/TikTok.list",
  },
  SteamFix: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://fastly.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/SteamFix.list",
    path: "./ruleset/SteamFix.list",
  },
  YouTube: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/YouTube/YouTube.list",
    path: "./ruleset/YouTube.list",
  },
  Twitter: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Twitter/Twitter.list",
    path: "./ruleset/Twitter.list",
  },
  GoogleFCM: {
    type: "http",
    behavior: "classical",
    interval: 86400,
    format: "text",
    path: "./ruleset/FirebaseCloudMessaging.list",
    url: "https://fastly.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/FirebaseCloudMessaging.list",
  },
  Origin: {
    type: "http",
    behavior: "classical",
    interval: 86400,
    format: "text",
    url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Origin/Origin.list",
    path: "./ruleset/Origin.list",
  },
  Epic: {
    type: "http",
    behavior: "classical",
    interval: 86400,
    format: "text",
    url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Epic/Epic.list",
    path: "./ruleset/Epic.list",
  },
  Games: {
    type: "http",
    behavior: "classical",
    interval: 86400,
    format: "text",
    url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Game/Game.list",
    path: "./ruleset/Games.list",
  },
  MeiTuan: {
    type: "http",
    behavior: "classical",
    interval: 86400,
    format: "text",
    url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/MeiTuan/MeiTuan.list",
    path: "./ruleset/MeiTuan.list",
  },
  MeituanOverseas: {
    type: "http",
    behavior: "classical",
    interval: 86400,
    format: "text",
    url: "https://ruleset.11451919.xyz/ClashRule/ruleset/fuck-meituan.list",
    path: "./ruleset/MeituanOverseas.list",
  },
  PCDN: {
    type: "http",
    behavior: "classical",
    interval: 86400,
    format: "text",
    url: "https://fastly.jsdelivr.net/gh/IcyBlue17/ClashRule@main/ruleset/pcdn.list",
    path: "./ruleset/PCDN.list",
  },
  STUN: {
    type: "http",
    behavior: "classical",
    interval: 86400,
    format: "text",
    url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/STUN/STUN.list",
    path: "./ruleset/STUN.list",
  },
  HTTPDNS: {
    type: "http",
    behavior: "classical",
    interval: 86400,
    format: "text",
    url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/BlockHttpDNS/BlockHttpDNS.list",
    path: "./ruleset/BlockHttpDNS.list",
  },
};

const rules = [
  // 内网
  "RULE-SET,LAN,直连",
  /// 直连 -> 流媒体省流量
  "DOMAIN,d1m7jfoe9zdc1j.cloudfront.net,直连",
  "DOMAIN-SUFFIX,cloudfront.net,直连",
  /// 哔哩哔哩特殊规则
  "DOMAIN-SUFFIX,bilivideo.cn,直连",
  "DOMAIN-SUFFIX,bilivideo.com,直连",
  "DOMAIN-SUFFIX,bilivideo.net,直连",
  "DOMAIN-SUFFIX,hdslb.com,直连",
  "DOMAIN-SUFFIX,hdslb.net,直连",
  "DOMAIN-SUFFIX,hdslb.org,直连",
  "DOMAIN,mall.bilibili.com,直连",
  "DOMAIN,httpdns.bilivideo.com,拦截",
  // 拦截
  "RULE-SET,ADBlock,拦截",
  "RULE-SET,ZhihuADs,拦截",
  "RULE-SET,BanProgramAD,拦截",
  "RULE-SET,MeituanOverseas,拦截",
  "RULE-SET,PCDN,拦截",
  "RULE-SET,HTTPDNS,拦截",
  // 直连
  "RULE-SET,SteamFix,直连",
  "RULE-SET,GoogleFCM,直连",
  "GEOSITE,GOOGLE-PLAY@CN,直连",
  "GEOSITE,YOUTUBE@CN,直连",
  "GEOSITE,CATEGORY-SCHOLAR-CN,直连",
  "GEOSITE,MICROSOFT@CN,直连",
  // 常见
  "RULE-SET,AI,AI",
  "RULE-SET,TikTok,TikTok",
  "GEOSITE,TELEGRAM,Telegram",
  "GEOIP,TELEGRAM,Telegram,no-resolve",
  "GEOSITE,YOUTUBE,YouTube",
  "RULE-SET,YouTube,YouTube",
  "RULE-SET,Twitter,Twitter",
  "GEOSITE,NETFLIX,Netflix",
  "GEOIP,NETFLIX,Netflix,no-resolve",
  "GEOSITE,SPOTIFY,Spotify",
  "GEOSITE,BILIBILI,Bilibili",
  "GEOSITE,GFW,节点选择",
  // 静态
  "RULE-SET,StaticResources,静态资源",
  "RULE-SET,CDNResources,静态资源",
  // STUN
  "RULE-SET,STUN,节点选择",
  "DST-PORT,3478,节点选择",
  // 游戏
  "RULE-SET,Origin,Gaming",
  "RULE-SET,Epic,Gaming",
  "RULE-SET,Games,Gaming",
  // SSH
  "DST-PORT,22,SSH",
  // 美团
  "RULE-SET,MeiTuan,直连",
  // 保底
  "GEOSITE,CN,直连",
  "GEOSITE,PRIVATE,直连",
  "DOMAIN-SUFFIX,local,直连",
  "GEOIP,CN,直连",
  "GEOIP,PRIVATE,直连",
  // Fallback
  "MATCH,节点选择",
];

const snifferConfig = {
  sniff: {
    TLS: {
      ports: [443, 8443],
    },
    HTTP: {
      ports: [80, 8080, 8880],
    },
    QUIC: {
      ports: [443, 8443],
    },
  },
  "override-destination": false,
  enable: true,
  "force-dns-mapping": true,
  "skip-domain": ["Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com"],
};

const dnsConfig = {
  enable: true,
  ipv6: ipv6Enabled,
  "prefer-h3": true,
  "enhanced-mode": "redir-host",
  "default-nameserver": ["119.29.29.29", "223.5.5.5"],
  nameserver: [
    "system",
    "quic://223.5.5.5",
    "tls://dot.pub",
    "tls://dns.alidns.com",
  ],
  fallback: [
    "https://dns.cloudflare.com/dns-query",
    "https://dns.sb/dns-query",
  ],
  "proxy-server-nameserver": ["quic://223.5.5.5", "tls://dot.pub"],
};

const geoxURL = {
  geoip:
    "https://fastly.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat",
  geosite:
    "https://fastly.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat",
  mmdb: "https://fastly.jsdelivr.net/gh/Loyalsoldier/geoip@release/Country.mmdb",
  asn: "https://fastly.jsdelivr.net/gh/Loyalsoldier/geoip@release/GeoLite2-ASN.mmdb",
};

// 地区元数据
const countriesMeta = {
  香港: {
    pattern: "(?i)香港|港|HK|hk|Hong Kong|HongKong|hongkong|🇭🇰",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png",
  },
  澳门: {
    pattern: "(?i)澳门|MO|Macau|🇲🇴",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Macao.png",
  },
  台湾: {
    pattern: "(?i)台|新北|彰化|TW|Taiwan|🇹🇼",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png",
  },
  日本: {
    pattern: "(?i)日本|川日|东京|大阪|泉日|埼玉|沪日|深日|JP|Japan|🇯🇵",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png",
  },
  新加坡: {
    pattern: "(?i)新加坡|坡|狮城|SG|Singapore|🇸🇬",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Singapore.png",
  },
  韩国: {
    pattern: "(?i)KR|Korea|KOR|首尔|韩|韓|🇰🇷",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Korea.png",
  },
  美国: {
    pattern: "(?i)美国|美|US|United States|🇺🇸",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png",
  },
  加拿大: {
    pattern: "(?i)加拿大|Canada|CA|🇨🇦",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Canada.png",
  },
  英国: {
    pattern: "(?i)英国|United Kingdom|UK|伦敦|London|🇬🇧",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_Kingdom.png",
  },
  澳大利亚: {
    pattern: "(?i)澳洲|澳大利亚|AU|Australia|🇦🇺",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Australia.png",
  },
  德国: {
    pattern: "(?i)德国|德|DE|Germany|🇩🇪",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Germany.png",
  },
  法国: {
    pattern: "(?i)法国|法|FR|France|🇫🇷",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/France.png",
  },
  俄罗斯: {
    pattern: "(?i)俄罗斯|俄|RU|Russia|🇷🇺",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Russia.png",
  },
  泰国: {
    pattern: "(?i)泰国|泰|TH|Thailand|🇹🇭",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Thailand.png",
  },
  印度: {
    pattern: "(?i)印度|IN|India|🇮🇳",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/India.png",
  },
  马来西亚: {
    pattern: "(?i)马来西亚|马来|MY|Malaysia|🇲🇾",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Malaysia.png",
  },
  CloudFlare: {
    pattern: "(?i)中非共和国|CF",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Malaysia.png",
  },
};

function parseBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return false;
}

function hasLowCost(config) {
  // 检查是否有低倍率节点
  const proxies = config["proxies"];
  const lowCostRegex = new RegExp(/0\.[0-5]|低倍率|省流|大流量|实验性/, "i");
  for (const proxy of proxies) {
    if (lowCostRegex.test(proxy.name)) {
      return true;
    }
  }
  return false;
}

function hasIPv6Node(config) {
  // 检查是否有标记为 IPv6 的节点
  const proxies = config["proxies"];
  const IPv6Regex = new RegExp(
    /IPv6|ipv6|IPV6|v6|V6|ip6|IP6|\[.*:.*:.*\]|6in4|6to4|6over4/,
    "i",
  );
  for (const proxy of proxies) {
    if (IPv6Regex.test(proxy.name)) {
      return true;
    }
  }
  return false;
}

function parseCountries(config) {
  const proxies = config.proxies || [];
  const ispRegex = /家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地/i; // 需要排除的关键字

  // 用来累计各国节点数
  const countryCounts = Object.create(null);

  // 构建地区正则表达式，去掉 (?i) 前缀
  const compiledRegex = {};
  for (const [country, meta] of Object.entries(countriesMeta)) {
    compiledRegex[country] = new RegExp(
      meta.pattern.replace(/^\(\?i\)/, ""),
      "i",
    );
  }

  // 逐个节点进行匹配与统计
  for (const proxy of proxies) {
    const name = proxy.name || "";

    // 过滤掉不想统计的 ISP 节点
    if (ispRegex.test(name)) continue;

    // 找到第一个匹配到的地区就计数并终止本轮
    for (const [country, regex] of Object.entries(compiledRegex)) {
      if (regex.test(name)) {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
        break; // 避免一个节点同时累计到多个地区
      }
    }
  }

  // 将结果对象转成数组形式
  const result = [];
  for (const [country, count] of Object.entries(countryCounts)) {
    result.push({ country, count });
  }

  return result; // [{ country: 'Japan', count: 12 }, ...]
}

function buildCountryProxyGroups(countryList) {
  // 获取实际存在的地区列表
  const countryProxyGroups = [];

  // 为实际存在的地区创建节点组
  for (const country of countryList) {
    // 确保地区名称在预设的地区配置中存在
    if (countriesMeta[country]) {
      const groupName = `${country}节点`;
      const pattern = countriesMeta[country].pattern;

      const groupConfig = {
        name: groupName,
        icon: countriesMeta[country].icon,
        "include-all": true,
        filter: pattern,
        "exclude-filter": landing
          ? "(?i)家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地|0\.[0-5]|低倍率|省流|大流量|实验性"
          : "0\.[0-5]|低倍率|省流|大流量|实验性",
        type: loadBalance ? "load-balance" : "url-test",
      };

      if (!loadBalance) {
        Object.assign(groupConfig, {
          url: "https://cp.cloudflare.com/generate_204",
          interval: 180,
          tolerance: 20,
          lazy: false,
        });
      }

      countryProxyGroups.push(groupConfig);
    }
  }

  return countryProxyGroups;
}

function buildProxyGroups({
  countryList,
  countryProxyGroups,
  lowCost,
  IPv6Node,
  defaultProxies,
  defaultProxiesDirect,
  defaultSelector,
  defaultFallback,
}) {
  // 查看是否有特定地区的节点
  const hasTW = countryList.includes("台湾");
  const hasHK = countryList.includes("香港");
  const hasUS = countryList.includes("美国");
  // 排除落地节点、节点选择和故障转移以避免死循环
  const frontProxySelector = [
    ...defaultSelector.filter(
      (name) => name !== "落地节点" && name !== "故障转移",
    ),
  ];

  return [
    {
      name: "节点选择",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png",
      type: "select",
      proxies: defaultSelector,
    },
    {
      name: "手动切换",
      icon: "https://fastly.jsdelivr.net/gh/shindgewongxj/WHATSINStash@master/icon/select.png",
      "include-all": true,
      type: "select",
    },
    landing
      ? {
          name: "前置代理",
          icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Area.png",
          type: "select",
          "include-all": true,
          "exclude-filter":
            "(?i)家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地",
          proxies: frontProxySelector,
        }
      : null,
    landing
      ? {
          name: "落地节点",
          icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Airport.png",
          type: "select",
          "include-all": true,
          filter: "(?i)家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地",
        }
      : null,
    {
      name: "故障转移",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Bypass.png",
      type: "fallback",
      url: "https://cp.cloudflare.com/generate_204",
      proxies: defaultFallback,
      interval: 180,
      tolerance: 20,
      lazy: false,
    },
    lowCost
      ? {
          name: "低倍率",
          icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Lab.png",
          type: "url-test",
          url: "https://cp.cloudflare.com/generate_204",
          "include-all": true,
          filter: "(?i)0\.[0-5]|低倍率|省流|大流量|实验性",
        }
      : null,
    IPv6Node
      ? {
          name: "IPv6",
          icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Lab.png",
          type: "url-test",
          url: "https://cp.cloudflare.com/generate_204",
          "include-all": true,
          filter: "(?i)IPv6|v6",
        }
      : null,
    {
      name: "静态资源",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Cloudflare.png",
      type: "select",
      proxies: defaultProxies,
    },
    {
      name: "AI",
      icon: "https://fastly.jsdelivr.net/gh/powerfullz/override-rules@master/icons/chatgpt.svg",
      type: "select",
      proxies: defaultProxies.filter(
        (proxy) => proxy !== "台湾节点" && proxy !== "香港节点",
      ),
    },
    {
      name: "Telegram",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Telegram.png",
      type: "select",
      proxies: defaultProxies,
    },
    {
      name: "YouTube",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png",
      type: "select",
      proxies: defaultProxies,
    },
    {
      name: "Twitter",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Twitter.png",
      type: "select",
      proxies: defaultProxies,
    },
    {
      name: "Bilibili",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/bilibili.png",
      type: "select",
      proxies:
        hasTW && hasHK
          ? ["直连", "台湾节点", "香港节点"]
          : defaultProxiesDirect,
    },
    {
      name: "Netflix",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png",
      type: "select",
      proxies: defaultProxies,
    },
    {
      name: "Spotify",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Spotify.png",
      type: "select",
      proxies: defaultProxies,
    },
    {
      name: "TikTok",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/TikTok.png",
      type: "select",
      proxies: defaultProxies,
    },
    {
      name: "Gaming",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Game.png",
      type: "select",
      proxies: defaultProxies,
    },
    {
      name: "SSH",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Server.png",
      type: "select",
      proxies: defaultProxies,
    },
    {
      name: "直连",
      icon: "https://fastly.jsdelivr.netgh/Koolson/Qure@master/IconSet/Color/Direct.png",
      type: "select",
      proxies: ["DIRECT", "节点选择"],
    },
    {
      name: "拦截",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Advertising.png",
      type: "select",
      proxies: ["REJECT", "直连"],
    },
    ...countryProxyGroups,
  ].filter(Boolean); // 过滤掉 null 值
}

function main(config) {
  config = { proxies: config.proxies };
  // 解析地区与低倍率信息与 IPv6
  const countryInfo = parseCountries(config); // [{ country, count }]
  const lowCost = hasLowCost(config);
  const IPv6Node = hasIPv6Node(config);

  // 构建基础数组
  const {
    defaultProxies,
    defaultProxiesDirect,
    defaultSelector,
    defaultFallback,
    countryGroupNames: targetCountryList,
  } = buildBaseLists({ landing, lowCost, IPv6Node, countryInfo });

  // 为地区构建对应的 url-test / load-balance 组
  const countryProxyGroups = buildCountryProxyGroups(
    targetCountryList.map((n) => n.replace(/节点$/, "")),
  );

  // 生成代理组
  const proxyGroups = buildProxyGroups({
    countryList: targetCountryList.map((n) => n.replace(/节点$/, "")),
    countryProxyGroups,
    lowCost,
    IPv6Node,
    defaultProxies,
    defaultProxiesDirect,
    defaultSelector,
    defaultFallback,
  });
  const globalProxies = proxyGroups.map((item) => item.name);

  proxyGroups.push({
    name: "GLOBAL",
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Global.png",
    "include-all": true,
    type: "select",
    proxies: globalProxies,
  });

  if (fullConfig)
    Object.assign(config, {
      "mixed-port": 7890,
      "redir-port": 7892,
      "tproxy-port": 7893,
      "routing-mark": 7894,
      "allow-lan": true,
      ipv6: ipv6Enabled,
      mode: "rule",
      "unified-delay": true,
      "tcp-concurrent": true,
      "find-process-mode": "off",
      "log-level": "info",
      "geodata-loader": "standard",
      "external-controller": ":9097",
      "disable-keep-alive": !keepAliveEnabled,
      profile: {
        "store-selected": true,
      },
    });

  Object.assign(config, {
    "proxy-groups": proxyGroups,
    "rule-providers": ruleProviders,
    rules: rules,
    sniffer: snifferConfig,
    dns: dnsConfig,
    "geodata-mode": true,
    "geox-url": geoxURL,
  });

  return config;
}
