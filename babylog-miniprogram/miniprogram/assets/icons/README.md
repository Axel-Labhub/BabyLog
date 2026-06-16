# 图标资源说明

小程序 TabBar 需要以下图标文件，请自行准备或使用在线图标资源：

## 所需图标

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| record.png | 81×81 | 记录图标（灰色） |
| record-active.png | 81×81 | 记录图标（橙色） |
| history.png | 81×81 | 历史图标（灰色） |
| history-active.png | 81×81 | 历史图标（橙色） |
| baby.png | 81×81 | 宝宝图标（灰色） |
| baby-active.png | 81×81 | 宝宝图标（橙色） |
| settings.png | 81×81 | 设置图标（灰色） |
| settings-active.png | 81×81 | 设置图标（橙色） |

## 推荐图标来源

1. [阿里巴巴矢量图标库](https://www.iconfont.cn/)
2. [Flaticon](https://www.flaticon.com/)
3. 使用微信小程序默认图标

## 临时方案

如果暂时没有图标，可以修改 `app.json` 移除 TabBar 的 iconPath 配置：

```json
{
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "记录"
      },
      ...
    ]
  }
}
```

这样 TabBar 只显示文字，不显示图标。