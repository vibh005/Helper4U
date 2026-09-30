// Builds "WHERE <constants> AND a = $1 AND (b ILIKE $2 OR c ILIKE $2)" safely.
//  - conds: [sqlWithPlaceholders, value] pairs; every "?" in one condition uses that condition's value.
//  - constants: fixed SQL snippets with no user input.
exports.buildWhere = (conds, constants = []) => {
  const params = [];
  const parts = [...constants];
  for (const [sql, val] of conds) {
    params.push(val);
    parts.push(sql.split('?').join(`$${params.length}`));
  }
  return { where: parts.length ? 'WHERE ' + parts.join(' AND ') : '', params };
};
