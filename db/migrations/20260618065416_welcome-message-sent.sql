-- migrate:up
create table welcome_message_sent (
  guild_id text not null,
  user_id text not null,
  primary key (guild_id, user_id)
);

-- migrate:down
drop table if exists welcome_message_sent;
