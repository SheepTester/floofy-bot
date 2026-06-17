-- migrate:up
create table ucpd_seen (
  file_name text not null,
  primary key (file_name)
);

-- migrate:down
drop table if exists ucpd_seen;
