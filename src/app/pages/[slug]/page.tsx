"use client";

import { useEffect, useState, use } from "react";
import styled from "styled-components";
import { PageBlock } from "@/components/PageBuilder";

const Wrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Card = styled.article`
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  max-width: 900px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 16px;
  line-height: 1.2;
`;

const Description = styled.p`
  font-size: 1.1rem;
  color: #64748b;
  margin: 0 0 32px;
  line-height: 1.6;
`;

const Content = styled.div`
  font-size: 1rem;
  line-height: 1.8;
  color: #334155;
  
  h1, h2, h3, h4, h5, h6 {
    color: #0f172a;
    margin-top: 2em;
    margin-bottom: 1em;
    font-weight: 700;
  }
  
  h1 { font-size: 2rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.5rem; }
  h4 { font-size: 1.25rem; }
  
  p {
    margin-bottom: 1em;
  }
  
  ul, ol {
    margin: 1em 0;
    padding-left: 2em;
  }
  
  li {
    margin-bottom: 0.5em;
  }
  
  a {
    color: #3b82f6;
    text-decoration: underline;
    
    &:hover {
      color: #2563eb;
    }
  }
  
  code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  pre {
    background: #1e293b;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1em 0;
    
    code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
  }
  
  blockquote {
    border-left: 4px solid #3b82f6;
    padding-left: 16px;
    margin: 1em 0;
    color: #64748b;
    font-style: italic;
  }
  
  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em 0;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    
    th, td {
      padding: 12px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    
    th {
      background: #f8fafc;
      font-weight: 600;
    }
  }
`;

const Loading = styled.div`
  text-align: center;
  padding: 40px;
  color: #64748b;
  font-size: 1.1rem;
`;

const Error = styled.div`
  text-align: center;
  padding: 40px;
  color: #dc2626;
  font-size: 1.1rem;
`;

const BlocksContainer = styled.div`
  margin-top: 32px;
`;

const Button = styled.button<{ $style: "primary" | "secondary" | "outline" }>`
  padding: 12px 24px;
  border-radius: 8px;
  border: ${(p) => (p.$style === "outline" ? "2px solid #3b82f6" : "none")};
  background: ${(p) => 
    p.$style === "primary" ? "#3b82f6" : 
    p.$style === "secondary" ? "#64748b" : 
    "transparent"};
  color: ${(p) => (p.$style === "outline" ? "#3b82f6" : "#fff")};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 12px;

  &:hover {
    background: ${(p) => 
      p.$style === "primary" ? "#2563eb" : 
      p.$style === "secondary" ? "#475569" : 
      "rgba(59, 130, 246, 0.1)"};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`;

const CopyLinkButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: #fff;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: rgba(59, 130, 246, 0.5);
    color: #3b82f6;
  }
`;

export default function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const { slug } = use(params);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/pages/by-slug?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error("Página não encontrada");
        const data = await res.json();
        setTitle(data.title || "");
        setDescription(data.description || "");
        setContent(data.content || "");
        try {
          const parsedBlocks = data.blocks ? (typeof data.blocks === "string" ? JSON.parse(data.blocks) : data.blocks) : [];
          setBlocks(Array.isArray(parsedBlocks) ? parsedBlocks : []);
        } catch {
          setBlocks([]);
        }
        setLoading(false);
      } catch (e: any) {
        setError(e?.message || "Erro ao carregar página");
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return <Wrapper><Card><Loading>Carregando...</Loading></Card></Wrapper>;
  if (error) return <Wrapper><Card role="alert"><Error>{error}</Error></Card></Wrapper>;

  function copyToClipboard(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert("Link copiado para a área de transferência!");
      }).catch(() => {
        alert("Erro ao copiar link");
      });
    } else {
      // Fallback para navegadores antigos
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Link copiado para a área de transferência!");
    }
  }

  function renderBlock(block: PageBlock) {
    switch (block.type) {
      case "heading":
        const HeadingTag = `h${block.props?.headingLevel || 2}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag style={{ 
            margin: "1.5em 0 1em",
            color: block.props?.color || "#0f172a",
            textAlign: block.props?.align || "left"
          }}>
            {block.props?.text || "Título"}
          </HeadingTag>
        );
      case "text":
        return (
          <p style={{ 
            margin: "1em 0",
            color: block.props?.color || "#334155",
            textAlign: block.props?.align || "left"
          }}>
            {block.props?.text || "Texto"}
          </p>
        );
      case "button":
        const pageUrl = typeof window !== "undefined" ? window.location.href : "";
        return (
          <div style={{ 
            margin: "1.5em 0",
            textAlign: block.props?.align || "left"
          }}>
            <Button
              $style={block.props?.buttonStyle || "primary"}
              onClick={() => {
                if (block.props?.url) {
                  if (block.props.target === "_blank") {
                    window.open(block.props.url, "_blank");
                  } else {
                    window.location.href = block.props.url;
                  }
                }
              }}
            >
              {block.props?.buttonText || "Botão"}
            </Button>
            {block.props?.copyLink && (
              <CopyLinkButton
                onClick={() => copyToClipboard(block.props?.url || pageUrl)}
                title="Copiar link"
              >
                📋 Copiar Link
              </CopyLinkButton>
            )}
          </div>
        );
      case "image":
        return (
          <div style={{ 
            margin: "1.5em 0",
            textAlign: block.props?.align || "center"
          }}>
            {block.props?.imageUrl ? (
              <img
                src={block.props.imageUrl}
                alt={block.props.imageAlt || ""}
                style={{ maxWidth: "100%", height: "auto", borderRadius: "8px" }}
              />
            ) : (
              <div style={{ padding: "40px", background: "#f1f5f9", borderRadius: "8px", color: "#64748b" }}>
                Imagem não configurada
              </div>
            )}
          </div>
        );
      case "divider":
        return <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "2em 0" }} />;
      case "link":
        return (
          <div style={{ margin: "1em 0", textAlign: block.props?.align || "left" }}>
            <a
              href={block.props?.url || "#"}
              target={block.props?.target || "_self"}
              rel={block.props?.target === "_blank" ? "noopener noreferrer" : undefined}
              style={{ 
                color: block.props?.color || "#3b82f6", 
                textDecoration: "underline",
                fontSize: "1.1rem"
              }}
            >
              {block.props?.text || "Link"}
            </a>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <Wrapper>
      <Card>
        <Title>{title}</Title>
        {description && <Description>{description}</Description>}
        {blocks.length > 0 ? (
          <BlocksContainer>
            {blocks.map((block) => (
              <div key={block.id}>
                {renderBlock(block)}
              </div>
            ))}
          </BlocksContainer>
        ) : (
          <Content dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </Card>
    </Wrapper>
  );
}

