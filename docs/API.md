# API 说明

Pages Functions 只接管 `public/_routes.json` 中声明的 `/api/*` 与 `/media/*`。API 面向同一站点的前端使用；所有管理操作使用 Bearer token，所有带 `Origin` 的写请求还要通过同源检查。

## 鉴权

管理接口使用 Cloudflare secret `ADMIN_TOKEN`：

```http
Authorization: Bearer <ADMIN_TOKEN>
```

仓库只记录 secret 名称，不保存值。鉴权失败返回 `401` 与 `WWW-Authenticate`。对写接口，如果请求包含的 `Origin` 与当前站点 origin 不一致，则返回 `403`。

写入还受 `HUGO_READ_ONLY` 控制：`true` 返回 `403 Preview Is Read-Only`，`false` 明确允许进入后续写入校验；未显式设置时才以 `CF_PAGES_BRANCH` 是否为非 `main` 分支作补充判断。仓库的预览环境配置为只读，但仍共享生产媒体 bucket；公开读取、token 验证和已鉴权的管理读取不因此被禁止。

## 路由

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/auth/check` | 管理员、同源 | 验证管理 token |
| `GET`, `HEAD` | `/api/home` | 公开 | 读取站点配置与首页引用作品的紧凑摘要，支持 ETag 条件请求 |
| `GET`, `HEAD` | `/api/site` | 公开 | 读取站点配置，支持 ETag 条件请求 |
| `PUT` | `/api/site` | 管理员、同源 | 更新站点配置；写入前自动备份 |
| `GET`, `HEAD` | `/api/photos` | 公开 | 读取作品清单，支持 ETag 条件请求 |
| `POST` | `/api/photos` | 管理员、同源 | 以 `multipart/form-data` 上传原图及可选缩略图 |
| `DELETE` | `/api/photos` | 管理员、同源 | 清空当前作品清单；写入前自动备份，不立即删除媒体 |
| `PATCH` | `/api/photos/:id` | 管理员、同源 | 编辑字段或调整作品顺序；写入前自动备份 |
| `DELETE` | `/api/photos/:id` | 管理员、同源 | 从清单删除单张作品；写入前自动备份，不立即删除媒体 |
| `PATCH` | `/api/photos/batch` | 管理员、同源 | 对最多 500 个 ID 批量补充字段 |
| `POST` | `/api/photos/thumbnails` | 管理员、同源 | 一次上传最多 12 个缩略图；替换已有缩略图前自动备份 |
| `GET` | `/api/backups` | 管理员 | 列出备份 |
| `POST` | `/api/backups` | 管理员、同源 | 创建手动备份 |
| `POST` | `/api/backups/import` | 管理员、同源 | 导入站点配置与作品清单；导入前自动备份 |
| `GET` | `/api/backups/:id` | 管理员 | 读取一个备份 |
| `DELETE` | `/api/backups/:id` | 管理员、同源 | 删除一个备份并重算受保护媒体 key |
| `POST` | `/api/backups/:id/restore` | 管理员、同源 | 恢复一个备份；恢复前再自动备份当前状态 |
| `GET` | `/api/storage` | 管理员 | 扫描 R2 引用、孤儿对象、容量和清理候选项 |
| `DELETE` | `/api/storage/orphans` | 管理员、同源 | 使用最新审计 token 清理本批最多 1000 个未引用对象 |
| `GET`, `HEAD` | `/media/uploads/demo/example.jpg | 公开 | 从 R2 读取原图，响应设为长期 immutable 缓存 |
| `GET`, `HEAD` | `/media/uploads/demo/example.jpg | 公开 | 从 R2 读取缩略图，响应设为长期 immutable 缓存 |

任意 `/api/*` 路径的 `OPTIONS` 返回空的成功响应。未列出的路由返回 `404`；不支持的方法返回 `405` 和 `Allow`。

## 首页摘要与静态预览

`GET /api/home` 返回 `{ site, manifest }`：`site` 是当前站点配置，`manifest` 包含 `updatedAt`、`revision` 和 `photos`。`photos` 只保留首页图片与机场封面实际引用的作品，通过原图或缩略图 R2 key 匹配；它不是完整作品清单，也不提供全库统计。没有匹配项时返回空数组，而不是自动返回全库。

首页在构建时预置同样范围的元数据，正常更新只调用 `/api/home`；用户打开地图后才需要完整 `/api/photos`，异常回退也可能读取完整清单。`/api/home` 的 ETag 同时包含站点配置与作品清单的版本，任一来源改变都会使旧校验值失效；`HEAD` 返回相同状态和响应头但不返回正文。

433 张静态 WebP 预览由 Pages 静态资源提供，不是新 R2 对象，也不由 `/api/home` 改写照片 URL。构建源映射 `public/assets/previews/index.json` 以完整 `thumbSrc`（保留 `?v=`）为键，构建后生成 `/assets/generated/previews.<hash>.json`。首页只嵌入自身引用映射，作品页只嵌入前 30 张映射及完整索引 URL，其余按需加载。版本不匹配或静态文件加载失败时使用原缩略图，灯箱继续使用原图。

静态索引和预览随代码部署，不随后台修改实时重建；后台缩略图迁移仍使用独立的受保护 R2 写接口。更换缩略图 key 或版本后，客户端不会因忽略查询参数而复用旧静态预览。

## 上传约束

原图单文件最大为 32 MiB，缩略图单文件最大为 4 MiB；缩略图批次最多 12 个。接受以下 MIME 类型：

- `image/avif`
- `image/gif`
- `image/heic`
- `image/heif`
- `image/jpeg`
- `image/png`
- `image/tiff`
- `image/webp`

作品上传表单的原图字段为 `file`，可选缩略图字段为 `thumbnail`。文字字段包括 `title`、`alt`、`airline`、`aircraft`、`registration`、`airport`、`capturedAt`、`phase`、`spot` 和 `notes`；另支持 `categories` 与 `layout`。后台的全库缩略图优化在整次任务开始前只创建一个恢复点，不会因 1–2 张的小批次写入挤掉备份环。

## 数据与缓存

R2 中使用三个业务数据对象，并在首次管理写入时增加一个短期租约对象：

| R2 key | 内容 |
| --- | --- |
| `photos/manifest.json` | 作品清单、修订号和更新时间 |
| `site/config.json` | 首页和站点配置 |
| `backups/index.json` | 备份索引与受保护媒体 key |
| `maintenance/mutation-lock.json` | 首次管理写操作时建立的短期并发租约；不需要预先 seed |

公开的 `/api/home`、`/api/site` 和 `/api/photos` 返回 `Cache-Control: public, max-age=0, must-revalidate` 和弱 ETag。站点与作品清单优先使用 R2 对象 ETag；缺少对象版本时回退到更新时间与修订号，首页摘要组合两者的版本。匹配 `If-None-Match` 时返回 `304`；没有该请求头时也支持 `If-Modified-Since`。前台使用可重新验证的缓存请求，不再始终绕过缓存。

媒体响应支持 `HEAD`、条件请求、`Range` 和 `If-Range`，并使用一年 immutable 缓存；媒体 URL 因而应在文件内容变化时更换 key 或版本参数。生成的静态预览与带哈希的预览索引同样独立缓存，不更改 R2 中的原数据。

结构化 R2 写入使用对象 ETag 做 compare-and-swap；如果同一对象在读取后被另一请求改写，当前请求返回 `409`，不会静默覆盖较新的清单、站点配置或备份索引。备份导入还会校验站点结构、照片对象、唯一 ID、媒体 key 与 URL 的对应关系，并确认所有被引用媒体在 R2 中实际存在，再执行任何写入。当前首页配置中的媒体引用和每个备份当时的首页媒体引用，也会进入保护集合，避免仅从作品清单判断时误删仍在使用的图片。

除 `HEAD`、`OPTIONS`、`304` 等无正文响应外，API 数据与错误响应使用 JSON；常见错误形式为：

```json
{
  "error": "Unauthorized"
}
```

部分错误会额外包含 `detail`。服务端异常只向客户端返回通用的 `Internal Server Error`。

## 备份与孤儿清理

重建实现最多保留 20 个备份。作品删除只修改清单，媒体仍由备份索引保护；R2 媒体的实际删除通过两阶段流程进行：

1. `GET /api/storage` 生成当前审计结果和 `auditToken`；
2. 将该 token 作为 JSON 字段提交给 `DELETE /api/storage/orphans`。

如果两次请求之间存储状态变化，token 校验会返回 `409`，必须重新扫描。候选项包括未被清单或备份引用的媒体，以及索引已经移除但物理删除失败的旧备份对象。只有对象自身的 R2 上传时间已超过 7 天时才会进入删除集合；这不是“从取消引用时重新计时”的宽限期。每次最多删除 1000 个，若响应显示仍有下一批，重新扫描并确认即可。

R2 不提供跨对象事务。所有管理写操作会共享一枚以 R2 条件写实现的 10 分钟短期租约；孤儿清理在持有租约后重新扫描，因而不会与受支持的导入、恢复、首页保存或作品修改并发。锁持有时另一写请求会返回 `409`，异常退出遗留的租约到期后可由下一请求接管。备份恢复还会先保存当前恢复点、对每个 JSON 对象使用条件写入，并在第二步失败时尝试补偿回滚；若连补偿写入也失败，接口会明确返回 `503 Partial Restore`，而恢复前建立的备份仍保护原数据和媒体。即使如此，仍应避免在多个后台标签页中同时执行大型操作，也不要让外部脚本绕过 API 同时直接改写同一 bucket。
