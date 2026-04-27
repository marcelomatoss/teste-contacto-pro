import { describe, it, expect } from "vitest";
import type { proto } from "@whiskeysockets/baileys";
import { extractTextContent, isAudioMessage } from "./media.js";

const make = (message: Partial<proto.IMessage>): proto.IWebMessageInfo =>
  ({
    key: { id: "X", remoteJid: "1@s.whatsapp.net", fromMe: false },
    message: message as proto.IMessage,
  }) as proto.IWebMessageInfo;

describe("extractTextContent", () => {
  it("returns conversation text", () => {
    expect(extractTextContent(make({ conversation: "Olá" }))).toBe("Olá");
  });

  it("returns extendedTextMessage text", () => {
    expect(
      extractTextContent(
        make({ extendedTextMessage: { text: "linkado" } as proto.Message.IExtendedTextMessage }),
      ),
    ).toBe("linkado");
  });

  it("returns image caption", () => {
    expect(
      extractTextContent(
        make({ imageMessage: { caption: "foto" } as proto.Message.IImageMessage }),
      ),
    ).toBe("foto");
  });

  it("returns null when there is no usable text", () => {
    expect(extractTextContent(make({}))).toBeNull();
  });
});

describe("isAudioMessage", () => {
  it("detects plain audioMessage", () => {
    expect(
      isAudioMessage(
        make({ audioMessage: { mimetype: "audio/ogg" } as proto.Message.IAudioMessage }),
      ),
    ).toBe(true);
  });

  it("detects audio inside ephemeralMessage", () => {
    expect(
      isAudioMessage(
        make({
          ephemeralMessage: {
            message: {
              audioMessage: { mimetype: "audio/ogg" },
            },
          } as proto.Message.IFutureProofMessage,
        }),
      ),
    ).toBe(true);
  });

  it("detects audio inside viewOnceMessage", () => {
    expect(
      isAudioMessage(
        make({
          viewOnceMessage: {
            message: {
              audioMessage: { mimetype: "audio/ogg" },
            },
          } as proto.Message.IFutureProofMessage,
        }),
      ),
    ).toBe(true);
  });

  it("returns false for text-only messages", () => {
    expect(isAudioMessage(make({ conversation: "oi" }))).toBe(false);
  });
});
