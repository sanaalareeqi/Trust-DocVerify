import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: () => apiRequest("GET", "/api/documents"),
  });
}

export function useDocumentsByUserRole(userId: number, role: string) {
  return useQuery({
    queryKey: ["documents", userId, role],
    queryFn: () => apiRequest("GET", `/api/documents/user/${userId}/${role}`),
    enabled: !!userId && !!role,
  });
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: ["documents", id],
    queryFn: () => apiRequest("GET", `/api/documents/${id}`),
    enabled: !!id,
  });
}

export function useSignatureLogs(documentId: number) {
  return useQuery({
    queryKey: ["signatures", documentId],
    queryFn: () => apiRequest("GET", `/api/documents/${documentId}/signatures`),
    enabled: !!documentId,
  });
}

export function useNotifications(userId: number) {
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => apiRequest("GET", `/api/notifications/${userId}`),
    enabled: !!userId,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (doc: any) => apiRequest("POST", "/api/documents", doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useSignDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest("PUT", `/api/documents/${id}/sign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useReturnDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest("PUT", `/api/documents/${id}/return`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest("PUT", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
