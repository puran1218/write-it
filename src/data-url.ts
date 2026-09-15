/**
 * 数据源地址：静态数据不在 micro.blog 插件仓库里（那是个轻部署壳），
 * 而是从 write-it 仓库经 jsDelivr CDN 按版本读取。
 *
 * 更新数据时的约定：
 *   1. npm run data && npm run build，提交并打新 tag（data-v2、data-v3…）
 *   2. 把这里的 @data-v1 和 service-worker.js 里的 zi-data-v1 一起升一位
 *
 * 本地调试想用 static/zi/data 的本地数据：URL 加 ?local-data。
 */

const params = new URLSearchParams(location.search);
const LOCAL_DATA = params.has("local-data");

export const DATA_BASE_URL = LOCAL_DATA
  ? "./data"
  : "https://cdn.jsdelivr.net/gh/puran1218/write-it@data-v1/static/zi/data";

export function dataUrl(path: string): string {
  return `${DATA_BASE_URL}/${path}`;
}
