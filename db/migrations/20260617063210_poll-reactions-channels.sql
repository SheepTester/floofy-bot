-- migrate:up
create table poll_reactions_channels (
  channel_id text not null,
  primary key (channel_id)
);

-- migrate:down
drop table if exists poll_reactions_channels;
