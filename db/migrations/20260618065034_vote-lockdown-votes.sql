-- migrate:up
create table vote_lockdown_votes (
  guild_id text not null,
  user_id text not null,
  vote_time number not null,
  primary key (guild_id, user_id)
);

-- migrate:down
drop table if exists vote_lockdown_votes;
