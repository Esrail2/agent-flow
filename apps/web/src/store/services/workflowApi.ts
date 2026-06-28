import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './apiSlice';

export interface WorkflowNode {
  id: string;
  type: string;
  positionX: number;
  positionY: number;
  data: any;
}

export interface WorkflowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  viewport: { x: number; y: number; zoom: number };
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  _count?: { nodes: number };
  createdAt: string;
  updatedAt: string;
}

export const workflowApi = createApi({
  reducerPath: 'workflowApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Workflow'],
  endpoints: (builder) => ({
    getWorkflows: builder.query<{ success: boolean; data: Workflow[] }, void>({
      query: () => '/workflows',
      providesTags: ['Workflow'],
    }),
    
    getWorkflowById: builder.query<{ success: boolean; data: Workflow }, string>({
      query: (id) => `/workflows/${id}`,
      providesTags: (result, error, id) => [{ type: 'Workflow', id }],
    }),

    createWorkflow: builder.mutation<{ success: boolean; data: Workflow }, { name: string; description?: string }>({
      query: (body) => ({
        url: '/workflows',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Workflow'],
    }),

    saveWorkflow: builder.mutation<{ success: boolean }, { id: string; nodes: any[]; edges: any[]; viewport: any }>({
      query: ({ id, ...body }) => ({
        url: `/workflows/${id}/save`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Workflow', id }],
    }),

    deleteWorkflow: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/workflows/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Workflow'],
    }),
  }),
});

export const {
  useGetWorkflowsQuery,
  useGetWorkflowByIdQuery,
  useCreateWorkflowMutation,
  useSaveWorkflowMutation,
  useDeleteWorkflowMutation,
} = workflowApi;
