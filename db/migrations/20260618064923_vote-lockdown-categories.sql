-- migrate:up
create table vote_lockdown_categories (
  guild_id text not null,
  category_id text not null,
  primary key (guild_id)
);

-- migrate:down
drop table if exists vote_lockdown_categories;
