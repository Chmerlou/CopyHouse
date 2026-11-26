import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadedDocumentFixture } from "@/shared/api/contract-fixtures";
import { readPrintOptions, savePendingDocuments, savePrintOptions } from "@/shared/order-draft";
import { ConfigureForm, type LoadDocument } from "./configure-form";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const documentId = uploadedDocumentFixture.id;

describe("ConfigureForm", () => {
  beforeEach(() => {
    sessionStorage.clear();
    push.mockClear();
  });

  it("saves valid print options and opens comparison without a chosen point", async () => {
    savePendingDocuments([uploadedDocumentFixture]);
    const user = userEvent.setup();
    render(<ConfigureForm documentId={documentId} />);

    await user.click(screen.getByRole("radio", { name: "Цветная" }));
    const copies = screen.getByRole("spinbutton", { name: "Количество копий" });
    await user.clear(copies);
    expect(screen.getByRole("button", { name: "Сравнить цены" })).toBeDisabled();
    await user.type(copies, "2");
    await user.click(screen.getByRole("button", { name: "Сравнить цены" }));

    expect(readPrintOptions(documentId)).toEqual({ documentId, colorMode: "COLOR", copies: 2 });
    expect(push).toHaveBeenCalledWith(`/points?documentId=${documentId}`);
  });

  it("restores saved options and loads document details when needed", async () => {
    savePrintOptions({ documentId, colorMode: "COLOR", copies: 3 });
    const loadDocument = vi.fn<LoadDocument>().mockResolvedValue(uploadedDocumentFixture);
    render(<ConfigureForm documentId={documentId} loadDocument={loadDocument} />);

    expect(await screen.findByText(uploadedDocumentFixture.originalName)).toBeVisible();
    expect(screen.getByRole("radio", { name: "Цветная" })).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "Количество копий" })).toHaveValue(3);
    expect(screen.getByRole("button", { name: "Сравнить цены" })).toBeEnabled();
  });
});
