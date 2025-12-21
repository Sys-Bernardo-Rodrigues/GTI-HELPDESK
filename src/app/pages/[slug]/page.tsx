"use client";

import { useEffect, useState, use } from "react";
import styled from "styled-components";
import { PageBlock } from "@/components/PageBuilder";

const Wrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, var(--primary-50) 0%, var(--secondary-50) 50%, var(--primary-100) 100%);
  padding: 60px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(2, 132, 199, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(147, 51, 234, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const Card = styled.article`
  background: var(--surface);
  border-radius: 24px;
  padding: 56px;
  max-width: 960px;
  width: 100%;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border);
  position: relative;
  z-index: 1;
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    padding: 40px 28px;
    border-radius: 20px;
  }
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 20px;
  line-height: 1.2;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--primary-700) 0%, var(--secondary-700) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 2.25rem;
  }
`;

const Description = styled.p`
  font-size: 1.25rem;
  color: var(--text-muted);
  margin: 0 0 48px;
  line-height: 1.7;
  font-weight: 400;

  @media (max-width: 768px) {
    font-size: 1.125rem;
    margin-bottom: 32px;
  }
`;

const Content = styled.div`
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--text);
  
  h1, h2, h3, h4, h5, h6 {
    color: var(--text);
    margin-top: 2em;
    margin-bottom: 1em;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }
  
  h1 { 
    font-size: 2.5rem; 
    background: linear-gradient(135deg, var(--primary-700) 0%, var(--secondary-700) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  h2 { 
    font-size: 2rem;
    color: var(--primary-700);
  }
  h3 { font-size: 1.75rem; }
  h4 { font-size: 1.5rem; }
  
  p {
    margin-bottom: 1.5em;
    color: var(--text-muted);
  }
  
  ul, ol {
    margin: 1.5em 0;
    padding-left: 2em;
    color: var(--text-muted);
  }
  
  li {
    margin-bottom: 0.75em;
    line-height: 1.7;
  }
  
  a {
    color: var(--primary-600);
    text-decoration: none;
    font-weight: 600;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    
    &:hover {
      color: var(--primary-700);
      border-bottom-color: var(--primary-400);
    }
  }
  
  code {
    background: var(--gray-100);
    padding: 4px 8px;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    color: var(--primary-700);
    border: 1px solid var(--border);
  }
  
  pre {
    background: var(--gray-900);
    color: var(--gray-100);
    padding: 24px;
    border-radius: 12px;
    overflow-x: auto;
    margin: 1.5em 0;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border);
    
    code {
      background: transparent;
      padding: 0;
      color: inherit;
      border: none;
    }
  }
  
  blockquote {
    border-left: 4px solid var(--primary-500);
    padding: 16px 24px;
    margin: 1.5em 0;
    background: var(--primary-50);
    border-radius: 8px;
    color: var(--text);
    font-style: italic;
    box-shadow: var(--shadow-sm);
  }
  
  img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 2em 0;
    box-shadow: var(--shadow-lg);
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 2em 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border);
    
    th, td {
      padding: 16px;
      border: 1px solid var(--border);
      text-align: left;
    }
    
    th {
      background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
      font-weight: 700;
      color: var(--primary-900);
    }

    tr:nth-child(even) {
      background: var(--gray-50);
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

const StyledButton = styled.button<{ $style: "primary" | "secondary" | "outline" }>`
  padding: 14px 28px;
  border-radius: 12px;
  border: ${(p) => (p.$style === "outline" ? "2px solid var(--primary-500)" : "none")};
  background: ${(p) => 
    p.$style === "primary" ? "linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)" : 
    p.$style === "secondary" ? "linear-gradient(135deg, var(--gray-600) 0%, var(--gray-700) 100%)" : 
    "transparent"};
  color: ${(p) => (p.$style === "outline" ? "var(--primary-700)" : "#fff")};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-right: 12px;
  box-shadow: ${(p) => 
    p.$style === "primary" ? "0 4px 14px rgba(2, 132, 199, 0.35)" :
    p.$style === "secondary" ? "0 4px 14px rgba(71, 85, 105, 0.3)" :
    "none"};

  &:hover {
    background: ${(p) => 
      p.$style === "primary" ? "linear-gradient(135deg, var(--primary-700) 0%, var(--primary-800) 100%)" : 
      p.$style === "secondary" ? "linear-gradient(135deg, var(--gray-700) 0%, var(--gray-800) 100%)" : 
      "var(--primary-50)"};
    transform: translateY(-2px);
    box-shadow: ${(p) => 
      p.$style === "primary" ? "0 8px 20px rgba(2, 132, 199, 0.45)" :
      p.$style === "secondary" ? "0 8px 20px rgba(71, 85, 105, 0.4)" :
      "var(--shadow-md)"};
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
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    
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
        return (
          <div style={{ 
            margin: "1.5em 0",
            textAlign: block.props?.align || "left"
          }}>
            <StyledButton
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
            </StyledButton>
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
      case "button-group":
        return (
          <div style={{ 
            margin: "1.5em 0",
            display: "flex",
            gap: block.props?.buttonGap || "12px",
            justifyContent: block.props?.buttonAlign === "center" ? "center" : 
                          block.props?.buttonAlign === "right" ? "flex-end" :
                          block.props?.buttonAlign === "stretch" ? "stretch" : "flex-start",
            flexWrap: "wrap",
            alignItems: "center"
          }}>
            {(block.props?.buttons || []).map((btn) => (
              <div key={btn.id} style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                <StyledButton
                  $style={btn.style || "primary"}
                  onClick={() => {
                    if (btn.url) {
                      if (btn.target === "_blank") {
                        window.open(btn.url, "_blank");
                      } else {
                        window.location.href = btn.url;
                      }
                    }
                  }}
                  style={{ 
                    flex: block.props?.buttonAlign === "stretch" ? "1" : "0 1 auto",
                    marginRight: 0
                  }}
                >
                  {btn.text || "Botão"}
                </StyledButton>
                {btn.copyLink && (
                  <CopyLinkButton
                    onClick={() => copyToClipboard(btn.url || pageUrl)}
                    title="Copiar link"
                    style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                  >
                    📋 Copiar
                  </CopyLinkButton>
                )}
              </div>
            ))}
          </div>
        );
      case "container":
        return (
          <div style={{
            margin: "1.5em 0",
            padding: block.props?.containerPadding || "20px",
            background: block.props?.containerBackground || "transparent",
            border: block.props?.containerBorder || "1px solid rgba(148, 163, 184, 0.2)",
            borderRadius: block.props?.containerBorderRadius || "8px",
          }}>
            {/* Container pode conter outros blocos no futuro */}
          </div>
        );
      case "spacer":
        return (
          <div style={{ 
            height: block.props?.spacerHeight || "40px",
            width: "100%",
          }} />
        );
      case "columns":
        return (
          <div style={{
            margin: "1.5em 0",
            display: "grid",
            gridTemplateColumns: `repeat(${block.props?.columns || 2}, 1fr)`,
            gap: block.props?.columnGap || "20px",
          }}>
            {Array.from({ length: block.props?.columns || 2 }).map((_, i) => (
              <div key={i} style={{
                padding: "16px",
                background: "#f8fafc",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "8px",
                minHeight: "80px",
              }}>
                {/* Colunas podem conter outros blocos no futuro */}
              </div>
            ))}
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

