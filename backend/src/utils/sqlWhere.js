exports.buildWhere = (conds, constants = []) => {
  const params = [];
  const parts = [...constants];
  for (const [sql, val] of conds) {
    params.push(val);
    parts.push(sql.split('?').join(`$${params.length}`));
  }
  return { where: parts.length ? 'WHERE ' + parts.join(' AND ') : '', params };
};
