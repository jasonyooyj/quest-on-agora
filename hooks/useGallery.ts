import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/queries'
import { toast } from 'sonner'

interface Submission {
    id: string
    display_name: string | null
    stance: string | null
    stance_statement: string | null
    final_reflection: string | null
    is_submitted: boolean
    created_at: string
    likeCount: number
    hasLiked: boolean
    commentCount: number
    comments: Comment[]
}

interface Comment {
    id: string
    user_id: string
    user_name: string | null
    content: string
    created_at: string
}

interface GalleryData {
    discussion: {
        id: string
        title: string
        settings: {
            stanceLabels?: Record<string, string>
            anonymous?: boolean
        }
        status: string
    }
    submissions: Submission[]
}

export function useGallery(discussionId: string) {
    const queryClient = useQueryClient()

    const galleryQuery = useQuery({
        queryKey: QUERY_KEYS.gallery(discussionId),
        queryFn: async (): Promise<GalleryData> => {
            const response = await fetch(`/api/discussions/${discussionId}/gallery`)
            if (!response.ok) {
                throw new Error('Failed to fetch gallery')
            }
            return response.json()
        },
        enabled: !!discussionId,
    })

    const likeMutation = useMutation({
        mutationFn: async ({ participantId, hasLiked }: { participantId: string, hasLiked: boolean }) => {
            const method = hasLiked ? 'DELETE' : 'POST'
            const url = `/api/discussions/${discussionId}/likes${hasLiked ? `?participantId=${participantId}` : ''}`
            const body = hasLiked ? undefined : JSON.stringify({ participantId })

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body
            })

            if (!response.ok) throw new Error('Failed to toggle like')
            return { participantId, hasLiked }
        },
        onMutate: async ({ participantId, hasLiked }) => {
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.gallery(discussionId) })
            const previousGallery = queryClient.getQueryData<GalleryData>(QUERY_KEYS.gallery(discussionId))

            queryClient.setQueryData<GalleryData>(QUERY_KEYS.gallery(discussionId), (old) => {
                if (!old) return old
                return {
                    ...old,
                    submissions: old.submissions.map(s =>
                        s.id === participantId
                            ? {
                                ...s,
                                hasLiked: !hasLiked,
                                likeCount: hasLiked ? s.likeCount - 1 : s.likeCount + 1
                            }
                            : s
                    )
                }
            })

            return { previousGallery }
        },
        onError: (err, newTodo, context) => {
            if (context?.previousGallery) {
                queryClient.setQueryData(QUERY_KEYS.gallery(discussionId), context.previousGallery)
            }
            toast.error('좋아요 처리 중 오류가 발생했습니다')
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.gallery(discussionId) })
        }
    })

    const commentMutation = useMutation({
        mutationFn: async ({ participantId, content }: { participantId: string, content: string }) => {
            const response = await fetch(`/api/discussions/${discussionId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantId, content })
            })

            if (!response.ok) throw new Error('Failed to add comment')
            return response.json()
        },
        onSuccess: (data, variables) => {
            queryClient.setQueryData<GalleryData>(QUERY_KEYS.gallery(discussionId), (old) => {
                if (!old) return old
                return {
                    ...old,
                    submissions: old.submissions.map(s =>
                        s.id === variables.participantId
                            ? {
                                ...s,
                                comments: [...s.comments, data.comment],
                                commentCount: s.commentCount + 1
                            }
                            : s
                    )
                }
            })
            toast.success('댓글이 등록되었습니다')
        },
        onError: () => {
            toast.error('댓글 등록에 실패했습니다')
        }
    })

    return {
        galleryQuery,
        likeMutation,
        commentMutation
    }
}
