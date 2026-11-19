import { notFound, redirect } from "next/navigation";
import { DocumentEditor } from "@/components/editor/document-editor";
import { getSessionUser } from "@/lib/auth/session";
import { getDocument } from "@/lib/services/documents";

export const instant = false;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DocumentPage({ params }: PageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const document = await getDocument(user.id, id);
  if (!document) {
    notFound();
  }

  return (
    <DocumentEditor
      key={`${user.id}:${document.id}`}
      sessionUserId={user.id}
      sessionUserName={user.name}
      initial={document}
    />
  );
}
