-- migrate:up
create table leave_last_message (
  guild_id text not null,
  -- I'm not sure if this will be used
  channel_id text not null,
  user_id text not null,
  -- If the last message was sent and then the leave channel was changed, it'll
  -- just fail to load the message, as if it were deleted, which is fine
  message_id text not null,
  -- Mostly out of curiosity, may be empty
  content text not null,
  primary key (guild_id, user_id)
);

-- migrate:down
drop table if exists leave_last_message;
