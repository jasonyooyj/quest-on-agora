export const QUERY_KEYS = {
    discussion: (id: string) => ['discussion', id] as const,
    gallery: (id: string) => ['discussion', id, 'gallery'] as const,
    comments: (participantId: string) => ['comments', participantId] as const,
    likes: (participantId: string) => ['likes', participantId] as const,
}
