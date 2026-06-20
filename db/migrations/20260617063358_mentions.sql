-- migrate:up
create table mentions (
  channel_id text not null,
  -- ID of mentioned user/role, or `everyone`
  mentioned text not null,
  author text not null,
  content text not null,
  message_url text not null,
  is_role boolean not null,
  primary key (channel_id, mentioned)
);

-- migrate:down
drop table if exists mentions;
