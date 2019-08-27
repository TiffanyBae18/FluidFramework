/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FlowDocument } from "../../document";

export async function importDoc(docP: Promise<FlowDocument>, file: string) {
    const response = await fetch(`https://www.wu2.prague.office-int.com/public/literature/${file}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    const doc = await docP;

    try {
        while (true) {
            const {done, value} = await reader.read();
            if (done) {
                break;
            }

            const lines = decoder.decode(value).split(/\r?\n/);
            for (const paragraph of lines) {
                doc.insertText(doc.length, paragraph);
                doc.insertText(doc.length, "\n\n");
            }
        }
    } finally {
        reader.releaseLock();
    }
}
