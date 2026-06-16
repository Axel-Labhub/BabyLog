// 数据库安全规则

// 全局规则
{
  "read": true,
  "write": true,
  "validate": true
}

// 注意：以下规则需要在云开发控制台手动配置

// babies 集合规则
// {
//   "read": "auth.openid != null",
//   "write": "auth.openid != null && (data.members == null || data.members.indexOf(auth.openid) > -1)",
//   "validate": {
//     "name": "string && length(name) > 0 && length(name) < 50",
//     "birthDate": "string && length(birthDate) == 8",
//     "gender": "string && (gender == 'male' || gender == 'female')",
//     "members": "array"
//   }
// }

// records 集合规则
// {
//   "read": "auth.openid != null",
//   "write": "auth.openid != null",
//   "validate": {
//     "babyId": "string && length(babyId) > 0",
//     "type": "string && (type == 'feed' || type == 'sleep' || type == 'diaper' || type == 'temperature' || type == 'medicine')",
//     "ts": "number",
//     "dateKey": "string && length(dateKey) == 8"
//   }
// }

// users 集合规则
// {
//   "read": "auth.openid != null",
//   "write": "auth.openid != null",
//   "validate": {
//     "userId": "string && length(userId) > 0"
//   }
// }
