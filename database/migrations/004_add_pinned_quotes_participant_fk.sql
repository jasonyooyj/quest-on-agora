ALTER TABLE discussion_pinned_quotes
ADD CONSTRAINT discussion_pinned_quotes_participant_id_fkey
FOREIGN KEY (participant_id)
REFERENCES discussion_participants(id)
ON DELETE CASCADE;
