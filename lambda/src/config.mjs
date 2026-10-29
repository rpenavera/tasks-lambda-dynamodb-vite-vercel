export function loadConfig(env = process.env) {
  return {
    tableName: env.TABLE_NAME ?? '',
  };
}
