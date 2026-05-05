SELECT
  agent_role,
  SUM(cached_input_tokens)::bigint AS cached_input_tokens,
  SUM(input_tokens)::bigint AS input_tokens,
  CASE
    WHEN SUM(input_tokens) = 0 THEN 0
    ELSE ROUND(SUM(cached_input_tokens)::numeric / SUM(input_tokens)::numeric * 100, 2)
  END AS cache_hit_rate_pct
FROM llm_calls
GROUP BY agent_role
ORDER BY cache_hit_rate_pct DESC, agent_role ASC;
