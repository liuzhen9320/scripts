/**
 * 合并组合订阅中单条订阅的流量
 * 功能：将组合订阅中所有单条订阅的流量信息进行汇总（仅做加法运算）
 * 
 * @param {Array} proxies - 代理节点数组
 * @param {string} targetPlatform - 目标平台类型
 * @param {Object} context - 上下文对象，包含订阅源信息
 * @returns {Array} 返回原始的代理节点数组
 */

async function operator(proxies = [], targetPlatform, context) {
  const SUBS_KEY = 'subs'
  const COLLECTIONS_KEY = 'collections'
  const $ = $substore
  const { source } = context
  const { _collection: collection } = source
  if (!collection || Object.keys(source).length > 1) throw new Error('暂时仅支持组合订阅, 请在组合订阅中使用此脚本')

  const allSubs = $.read(SUBS_KEY) || []
  let uploadSum = 0
  let downloadSum = 0
  let totalSum = 0
  let expire

  let args = $arguments || {}
  const { parseFlowHeaders, getFlowHeaders, normalizeFlowHeader, flowTransfer, getRmainingDays } = flowUtils

  const subnames = [...collection.subscriptions]
  let subscriptionTags = collection.subscriptionTags
  if (Array.isArray(subscriptionTags) && subscriptionTags.length > 0) {
    allSubs.forEach(sub => {
      if (
        Array.isArray(sub.tag) &&
        sub.tag.length > 0 &&
        !subnames.includes(sub.name) &&
        sub.tag.some(tag => subscriptionTags.includes(tag))
      ) {
        subnames.push(sub.name)
      }
    })
  }

  for await (const sub of allSubs) {
    if (subnames.includes(sub.name)) {
      let subInfo
      let flowInfo
      if (sub.source !== 'local' || ['localFirst', 'remoteFirst'].includes(sub.mergeSources)) {
        try {
          let url =
            `${sub.url}`
              .split(/[\r\n]+/)
              .map(i => i.trim())
              .filter(i => i.length)?.[0] || ''

          let $arguments = {}
          const rawArgs = url.split('#')
          url = url.split('#')[0]
          if (rawArgs.length > 1) {
            try {
              // 支持 `#${encodeURIComponent(JSON.stringify({arg1: "1"}))}`
              $arguments = JSON.parse(decodeURIComponent(rawArgs[1]))
            } catch (e) {
              for (const pair of rawArgs[1].split('&')) {
                const key = pair.split('=')[0]
                const value = pair.split('=')[1]
                $arguments[key] = value == null || value === '' ? true : decodeURIComponent(value)
              }
            }
          }
          if (!$arguments.noFlow && /^https?/.test(url)) {
            // forward flow headers
            flowInfo = await getFlowHeaders(
              $arguments?.insecure ? `${url}#insecure` : url,
              $arguments.flowUserAgent,
              undefined,
              sub.proxy,
              $arguments.flowUrl
            )
            if (flowInfo) {
              const headers = normalizeFlowHeader(flowInfo, true)
              if (headers?.['subscription-userinfo']) {
                subInfo = headers['subscription-userinfo']
              }
            }
          }
        } catch (err) {
          $.error(`订阅 ${sub.name} 获取流量信息时发生错误: ${JSON.stringify(err)}`)
        }
      }
      if (sub.subUserinfo) {
        let subUserInfo
        if (/^https?:\/\//.test(sub.subUserinfo)) {
          try {
            subUserInfo = await getFlowHeaders(undefined, undefined, undefined, sub.proxy, sub.subUserinfo)
          } catch (e) {
            $.error(
              `订阅 ${sub.name} 使用自定义流量链接 ${sub.subUserinfo} 获取流量信息时发生错误: ${JSON.stringify(e)}`
            )
          }
        } else {
          subUserInfo = sub.subUserinfo
        }

        const headers = normalizeFlowHeader([subUserInfo, flowInfo].filter(i => i).join(';'), true)
        if (headers?.['subscription-userinfo']) {
          subInfo = headers['subscription-userinfo']
        }
      }
      if (subInfo) {
        const {
          total,
          usage: { upload, download },
          expires,
        } = parseFlowHeaders(subInfo)
        if (upload > 0) uploadSum += upload
        if (download > 0) downloadSum += download
        if (total > 0) totalSum += total
        if (expires && expires * 1000 > Date.now()) {
          expire = expire ? Math.min(expire, expires) : expires
        }
      }
    }
  }
  const subUserInfo = `upload=${uploadSum}; download=${downloadSum}; total=${totalSum}; expire=4099651200; plan_name=Pro;`

  // 旧版需要写入, 返回响应头里使用这个
  const allCols = $.read(COLLECTIONS_KEY) || []
  for (var index = 0; index < allCols.length; index++) {
    if (collection.name === allCols[index].name) {
      // 写入订阅流量信息
      allCols[index].subUserinfo = subUserInfo
      break
    }
  }
  $.write(allCols, COLLECTIONS_KEY)

  // 新版直接可以加到响应头里
  if ($options) {
    $options._res = {
      headers: {
        'subscription-userinfo': subUserInfo,
      },
    }
  }

  return proxies
}
