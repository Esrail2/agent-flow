'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGetWorkflowByIdQuery, useSaveWorkflowMutation } from '@/store/services/workflowApi';
import { useGetAgentsQuery } from '@/store/services/agentApi';
import AgentNode from './AgentNode';
import { Save, ArrowLeft, Loader2, Play } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const nodeTypes = {
  agent: AgentNode,
};

function BuilderCanvas({ id }: { id: string }) {
  const { data: workflowData, isLoading: isWfLoading } = useGetWorkflowByIdQuery(id);
  const { data: agentsData, isLoading: isAgentsLoading } = useGetAgentsQuery();
  const [saveWorkflow, { isLoading: isSaving }] = useSaveWorkflowMutation();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Initialize state from fetched data
  useEffect(() => {
    if (workflowData?.data) {
      const wf = workflowData.data;
      if (wf.nodes && wf.nodes.length > 0) {
        setNodes(wf.nodes.map(n => ({
          id: n.id,
          type: n.type,
          position: { x: n.positionX, y: n.positionY },
          data: n.data
        })));
      }
      if (wf.edges && wf.edges.length > 0) {
        setEdges(wf.edges.map(e => ({
          id: e.id,
          source: e.sourceId,
          target: e.targetId,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle
        })));
      }
    }
  }, [workflowData, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection | Edge) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowWrapper.current) return;

      const type = event.dataTransfer.getData('application/reactflow');
      const agentId = event.dataTransfer.getData('application/agentId');
      const agentName = event.dataTransfer.getData('application/agentName');
      
      if (typeof type === 'undefined' || !type) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: { label: agentName, agentId },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleSave = async () => {
    try {
      await saveWorkflow({
        id,
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type || 'default',
          position: n.position,
          data: n.data
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || undefined,
          targetHandle: e.targetHandle || undefined
        })),
        viewport: { x: 0, y: 0, zoom: 1 } // Simple viewport for now
      }).unwrap();
      toast.success('Workflow saved');
    } catch (e) {
      toast.error('Failed to save workflow');
    }
  };

  const onDragStart = (event: React.DragEvent, nodeType: string, agentId: string, agentName: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/agentId', agentId);
    event.dataTransfer.setData('application/agentName', agentName);
    event.dataTransfer.effectAllowed = 'move';
  };

  if (isWfLoading || isAgentsLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const agents = agentsData?.data || [];

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Topbar */}
      <header className="h-16 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/workflows" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-bold text-lg">{workflowData?.data?.name || 'Workflow Builder'}</h1>
            <p className="text-xs text-zinc-500">Visual automation pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-semibold transition-all">
            <Play className="h-4 w-4" />
            Run
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </header>

      {/* Main Builder Area */}
      <div className="flex flex-1 h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-64 border-r border-zinc-900 bg-zinc-900/40 p-4 flex flex-col gap-6 overflow-y-auto z-10">
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">AI Agents</h3>
            <div className="space-y-2">
              {agents.map((agent) => (
                <div 
                  key={agent.id}
                  className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-grab hover:border-blue-500/50 transition-colors"
                  onDragStart={(e) => onDragStart(e, 'agent', agent.id, agent.name)}
                  draggable
                >
                  <div className="font-medium text-sm text-zinc-200">{agent.name}</div>
                  <div className="text-xs text-zinc-500 truncate mt-1">{agent.modelId}</div>
                </div>
              ))}
              {agents.length === 0 && (
                <p className="text-xs text-zinc-500 italic">No agents found. Create one first.</p>
              )}
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-zinc-950"
          >
            <Background color="#27272a" gap={24} />
            <Controls className="!bg-zinc-900 !border-zinc-800 !fill-zinc-400" />
            <MiniMap className="!bg-zinc-900 !mask-none" nodeColor="#3b82f6" maskColor="rgba(0,0,0,0.5)" />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function BuilderPage({ params }: { params: { id: string } }) {
  return (
    <ReactFlowProvider>
      <BuilderCanvas id={params.id} />
    </ReactFlowProvider>
  );
}
