"use client";

import { useState, useRef } from "react";
import styled from "styled-components";

export type BlockType = "text" | "button" | "image" | "heading" | "divider" | "link";

export interface PageBlock {
  id: string;
  type: BlockType;
  content: string;
  props?: {
    text?: string;
    url?: string;
    target?: "_blank" | "_self";
    copyLink?: boolean;
    buttonText?: string;
    buttonStyle?: "primary" | "secondary" | "outline";
    imageUrl?: string;
    imageAlt?: string;
    headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
    align?: "left" | "center" | "right";
    color?: string;
    backgroundColor?: string;
    padding?: string;
    margin?: string;
  };
}

interface PageBuilderProps {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
}

const BuilderContainer = styled.div`
  display: flex;
  gap: 20px;
  min-height: 600px;
`;

const BlocksPalette = styled.div`
  width: 250px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
`;

const PaletteTitle = styled.h3`
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
`;

const BlockTypeButton = styled.button<{ $dragging?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: #fff;
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: grab;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;

  &:hover {
    background: #f1f5f9;
    border-color: rgba(59, 130, 246, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    cursor: grabbing;
    transform: translateY(0);
  }

  ${(p) => p.$dragging && `
    opacity: 0.5;
    cursor: grabbing;
  `}
`;

const EditorArea = styled.div`
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  min-height: 600px;
`;

const EditorTitle = styled.h3`
  margin: 0 0 20px;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
`;

const BlocksList = styled.div<{ $draggingOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  ${(p) => p.$draggingOver && `
    background: rgba(59, 130, 246, 0.05);
    border: 2px dashed rgba(59, 130, 246, 0.5);
    border-radius: 8px;
    padding: 12px;
  `}
`;

const BlockItem = styled.div<{ $dragging?: boolean; $selected?: boolean }>`
  position: relative;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid ${(p) => (p.$selected ? "rgba(59, 130, 246, 0.5)" : "rgba(148, 163, 184, 0.2)")};
  background: ${(p) => (p.$selected ? "rgba(59, 130, 246, 0.05)" : "#fff")};
  cursor: move;
  transition: all 0.2s ease;
  opacity: ${(p) => (p.$dragging ? 0.5 : 1)};

  &:hover {
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  ${(p) => p.$dragging && `
    transform: rotate(2deg);
  `}
`;

const BlockHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
`;

const BlockTypeLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const BlockActions = styled.div`
  display: flex;
  gap: 4px;
`;

const ActionButton = styled.button`
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(148, 163, 184, 0.1);
    color: #0f172a;
  }
`;

const BlockContent = styled.div`
  margin-top: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  font-size: 0.9rem;
`;

const DragHandle = styled.div`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: #94a3b8;

  &:active {
    cursor: grabbing;
  }

  &::before {
    content: "⋮⋮";
    font-size: 1.2rem;
    line-height: 1;
    letter-spacing: -2px;
  }
`;

const BLOCK_TYPES: Array<{ type: BlockType; label: string; icon: string }> = [
  { type: "heading", label: "Título", icon: "H" },
  { type: "text", label: "Texto", icon: "T" },
  { type: "button", label: "Botão", icon: "B" },
  { type: "image", label: "Imagem", icon: "🖼️" },
  { type: "divider", label: "Divisor", icon: "—" },
  { type: "link", label: "Link", icon: "🔗" },
];

export default function PageBuilder({ blocks, onChange }: PageBuilderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockType, setDraggedBlockType] = useState<BlockType | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  function addBlock(type: BlockType) {
    const newBlock: PageBlock = {
      id: Math.random().toString(36).slice(2),
      type,
      content: "",
      props: {
        text: type === "text" ? "Digite seu texto aqui..." : "",
        buttonText: type === "button" ? "Clique aqui" : "",
        headingLevel: type === "heading" ? 2 : undefined,
        buttonStyle: type === "button" ? "primary" : undefined,
        align: "left",
      },
    };
    onChange([...blocks, newBlock]);
    setEditingBlockId(newBlock.id);
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
    if (editingBlockId === id) setEditingBlockId(null);
  }

  function updateBlock(id: string, updates: Partial<PageBlock>) {
    onChange(
      blocks.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  }

  function handleDragStart(e: React.DragEvent, type: BlockType) {
    setDraggedBlockType(type);
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleBlockDragStart(e: React.DragEvent, blockId: string) {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedBlockId ? "move" : "copy";
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedBlockType) {
      // Adicionar novo bloco
      addBlock(draggedBlockType);
      setDraggedBlockType(null);
    } else if (draggedBlockId) {
      // Reordenar bloco existente
      const draggedBlock = blocks.find((b) => b.id === draggedBlockId);
      if (draggedBlock) {
        const newBlocks = blocks.filter((b) => b.id !== draggedBlockId);
        newBlocks.splice(index, 0, draggedBlock);
        onChange(newBlocks);
      }
      setDraggedBlockId(null);
    }
  }

  function handleDropOnEmpty(e: React.DragEvent) {
    e.preventDefault();
    if (draggedBlockType) {
      addBlock(draggedBlockType);
      setDraggedBlockType(null);
    }
  }

  function renderBlockPreview(block: PageBlock) {
    switch (block.type) {
      case "heading":
        const HeadingTag = `h${block.props?.headingLevel || 2}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag style={{ margin: 0 }}>
            {block.props?.text || "Título"}
          </HeadingTag>
        );
      case "text":
        return <p style={{ margin: 0 }}>{block.props?.text || "Texto"}</p>;
      case "button":
        return (
          <button
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "none",
              background: block.props?.buttonStyle === "primary" ? "#3b82f6" : "transparent",
              color: block.props?.buttonStyle === "primary" ? "#fff" : "#3b82f6",
              borderColor: block.props?.buttonStyle === "outline" ? "#3b82f6" : "transparent",
              borderWidth: block.props?.buttonStyle === "outline" ? "1px" : "0",
              borderStyle: "solid",
              cursor: "pointer",
            }}
          >
            {block.props?.buttonText || "Botão"}
          </button>
        );
      case "image":
        return (
          <div style={{ textAlign: "center" }}>
            {block.props?.imageUrl ? (
              <img
                src={block.props.imageUrl}
                alt={block.props.imageAlt || ""}
                style={{ maxWidth: "100%", height: "auto", borderRadius: "8px" }}
              />
            ) : (
              <div style={{ padding: "40px", background: "#f1f5f9", borderRadius: "8px", color: "#64748b" }}>
                Imagem
              </div>
            )}
          </div>
        );
      case "divider":
        return <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "20px 0" }} />;
      case "link":
        return (
          <a
            href={block.props?.url || "#"}
            target={block.props?.target || "_self"}
            style={{ color: "#3b82f6", textDecoration: "underline" }}
          >
            {block.props?.text || "Link"}
          </a>
        );
      default:
        return <div>{block.type}</div>;
    }
  }

  return (
    <BuilderContainer>
      <BlocksPalette>
        <PaletteTitle>Blocos</PaletteTitle>
        {BLOCK_TYPES.map((bt) => (
          <BlockTypeButton
            key={bt.type}
            draggable
            onDragStart={(e) => handleDragStart(e, bt.type)}
            onClick={() => addBlock(bt.type)}
            $dragging={draggedBlockType === bt.type}
          >
            <span>{bt.icon}</span>
            <span>{bt.label}</span>
          </BlockTypeButton>
        ))}
      </BlocksPalette>

      <EditorArea>
        <EditorTitle>Editor de Página</EditorTitle>
        <BlocksList
          onDragOver={(e) => {
            e.preventDefault();
            if (blocks.length === 0) {
              handleDropOnEmpty(e);
            }
          }}
          onDrop={(e) => {
            if (blocks.length === 0) {
              handleDropOnEmpty(e);
            }
          }}
          $draggingOver={dragOverIndex !== null}
        >
          {blocks.length === 0 ? (
            <EmptyState>
              Arraste blocos da paleta ou clique para adicionar
            </EmptyState>
          ) : (
            blocks.map((block, index) => (
              <div
                key={block.id}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <BlockItem
                  draggable
                  onDragStart={(e) => handleBlockDragStart(e, block.id)}
                  onDragEnd={() => {
                    setDraggedBlockId(null);
                    setDragOverIndex(null);
                  }}
                  onClick={() => setSelectedBlockId(block.id)}
                  $dragging={draggedBlockId === block.id}
                  $selected={selectedBlockId === block.id}
                >
                  <BlockHeader>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DragHandle />
                      <BlockTypeLabel>{block.type}</BlockTypeLabel>
                    </div>
                    <BlockActions>
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBlockId(block.id);
                        }}
                      >
                        ✏️ Editar
                      </ActionButton>
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBlock(block.id);
                        }}
                      >
                        🗑️ Remover
                      </ActionButton>
                    </BlockActions>
                  </BlockHeader>
                  <BlockContent>{renderBlockPreview(block)}</BlockContent>
                </BlockItem>
              </div>
            ))
          )}
        </BlocksList>
      </EditorArea>

      {editingBlockId && (() => {
        const block = blocks.find((b) => b.id === editingBlockId);
        if (!block) return null;
        return (
          <BlockEditorModal
            block={block}
            onSave={(updates) => {
              updateBlock(block.id, updates);
              setEditingBlockId(null);
            }}
            onClose={() => setEditingBlockId(null)}
          />
        );
      })()}
    </BuilderContainer>
  );
}

// Componente de edição de bloco
function BlockEditorModal({
  block,
  onSave,
  onClose,
}: {
  block: PageBlock;
  onSave: (updates: Partial<PageBlock>) => void;
  onClose: () => void;
}) {
  const [props, setProps] = useState(block.props || {});

  function handleSave() {
    onSave({ props });
  }

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalDialog onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h3>Editar {block.type}</h3>
          <button onClick={onClose}>✕</button>
        </ModalHeader>
        <ModalContent>
          {block.type === "heading" && (
            <>
              <Field>
                <Label>Texto</Label>
                <Input
                  value={props.text || ""}
                  onChange={(e) => setProps({ ...props, text: e.target.value })}
                />
              </Field>
              <Field>
                <Label>Nível</Label>
                <Select
                  value={props.headingLevel || 2}
                  onChange={(e) => setProps({ ...props, headingLevel: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 })}
                >
                  <option value={1}>H1</option>
                  <option value={2}>H2</option>
                  <option value={3}>H3</option>
                  <option value={4}>H4</option>
                  <option value={5}>H5</option>
                  <option value={6}>H6</option>
                </Select>
              </Field>
            </>
          )}
          {block.type === "text" && (
            <Field>
              <Label>Texto</Label>
              <Textarea
                value={props.text || ""}
                onChange={(e) => setProps({ ...props, text: e.target.value })}
                rows={5}
              />
            </Field>
          )}
          {block.type === "button" && (
            <>
              <Field>
                <Label>Texto do Botão</Label>
                <Input
                  value={props.buttonText || ""}
                  onChange={(e) => setProps({ ...props, buttonText: e.target.value })}
                />
              </Field>
              <Field>
                <Label>URL de Redirecionamento</Label>
                <Input
                  type="url"
                  value={props.url || ""}
                  onChange={(e) => setProps({ ...props, url: e.target.value })}
                  placeholder="https://exemplo.com"
                />
              </Field>
              <Field>
                <Label>Estilo</Label>
                <Select
                  value={props.buttonStyle || "primary"}
                  onChange={(e) => setProps({ ...props, buttonStyle: e.target.value as "primary" | "secondary" | "outline" })}
                >
                  <option value="primary">Primário</option>
                  <option value="secondary">Secundário</option>
                  <option value="outline">Outline</option>
                </Select>
              </Field>
              <Field>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={props.copyLink || false}
                    onChange={(e) => setProps({ ...props, copyLink: e.target.checked })}
                  />
                  <span>Mostrar opção de copiar link</span>
                </label>
              </Field>
            </>
          )}
          {block.type === "image" && (
            <>
              <Field>
                <Label>URL da Imagem</Label>
                <Input
                  type="url"
                  value={props.imageUrl || ""}
                  onChange={(e) => setProps({ ...props, imageUrl: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </Field>
              <Field>
                <Label>Texto Alternativo</Label>
                <Input
                  value={props.imageAlt || ""}
                  onChange={(e) => setProps({ ...props, imageAlt: e.target.value })}
                />
              </Field>
            </>
          )}
          {block.type === "link" && (
            <>
              <Field>
                <Label>Texto do Link</Label>
                <Input
                  value={props.text || ""}
                  onChange={(e) => setProps({ ...props, text: e.target.value })}
                />
              </Field>
              <Field>
                <Label>URL</Label>
                <Input
                  type="url"
                  value={props.url || ""}
                  onChange={(e) => setProps({ ...props, url: e.target.value })}
                  placeholder="https://exemplo.com"
                />
              </Field>
              <Field>
                <Label>Abrir em</Label>
                <Select
                  value={props.target || "_self"}
                  onChange={(e) => setProps({ ...props, target: e.target.value as "_blank" | "_self" })}
                >
                  <option value="_self">Mesma aba</option>
                  <option value="_blank">Nova aba</option>
                </Select>
              </Field>
            </>
          )}
        </ModalContent>
        <ModalActions>
          <button onClick={onClose}>Cancelar</button>
          <button onClick={handleSave} style={{ background: "#3b82f6", color: "#fff" }}>
            Salvar
          </button>
        </ModalActions>
      </ModalDialog>
    </ModalBackdrop>
  );
}

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalDialog = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  button {
    border: none;
    background: transparent;
    font-size: 1.5rem;
    cursor: pointer;
    color: #64748b;
  }
`;

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
`;

const Input = styled.input`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  font-size: 0.9rem;
`;

const Textarea = styled.textarea`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  font-size: 0.9rem;
  resize: vertical;
`;

const Select = styled.select`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  font-size: 0.9rem;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;

  button {
    padding: 10px 20px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    background: #fff;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
  }
`;

