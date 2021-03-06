import afterSVG from "../../assets/icons/after.svg";
import alignCenterSVG from "../../assets/icons/align-center.svg";
import beforeSVG from "../../assets/icons/before.svg";
import indentSVG from "../../assets/icons/indent.svg";
import outdentSVG from "../../assets/icons/outdent.svg";
import trashcanSVG from "../../assets/icons/trashcan.svg";
import {setSelectionFocus} from "../editor/setSelection";
import {i18n} from "../i18n";
import {disableToolbar} from "../toolbar/disableToolbar";
import {enableToolbar} from "../toolbar/enableToolbar";
import {removeCurrentToolbar} from "../toolbar/removeCurrentToolbar";
import {setCurrentToolbar} from "../toolbar/setCurrentToolbar";
import {getMarkdown} from "../util/getMarkdown";
import {
    hasClosestByAttribute,
    hasClosestByClassName,
    hasClosestByMatchTag,
    hasClosestByTag,
    hasTopClosestByTag,
} from "../util/hasClosest";
import {updateHotkeyTip} from "../util/updateHotkeyTip";
import {afterRenderEvent} from "./afterRenderEvent";
import {processCodeRender} from "./processCodeRender";

export const highlightToolbar = (vditor: IVditor) => {
    clearTimeout(vditor.wysiwyg.hlToolbarTimeoutId);
    vditor.wysiwyg.hlToolbarTimeoutId = window.setTimeout(() => {
        if (getSelection().rangeCount === 0) {
            return;
        }

        const allToolbar = ["headings", "bold", "italic", "strike", "line", "quote",
            "list", "ordered-list", "check", "code", "inline-code", "upload", "link", "table", "record"];
        removeCurrentToolbar(vditor.toolbar.elements, allToolbar);
        enableToolbar(vditor.toolbar.elements, allToolbar);

        const range = getSelection().getRangeAt(0);
        let typeElement = range.startContainer as HTMLElement;
        if (range.startContainer.nodeType === 3) {
            typeElement = range.startContainer.parentElement;
        }

        // 工具栏高亮和禁用
        if (hasClosestByMatchTag(typeElement, "OL")) {
            setCurrentToolbar(vditor.toolbar.elements, ["ordered-list"]);
        }

        if (hasClosestByMatchTag(typeElement, "BLOCKQUOTE")) {
            setCurrentToolbar(vditor.toolbar.elements, ["quote"]);
        }

        if (hasClosestByMatchTag(typeElement, "B") || hasClosestByMatchTag(typeElement, "STRONG")) {
            setCurrentToolbar(vditor.toolbar.elements, ["bold"]);
        }

        if (hasClosestByMatchTag(typeElement, "EM") || hasClosestByMatchTag(typeElement, "I")) {
            setCurrentToolbar(vditor.toolbar.elements, ["italic"]);
        }

        if (hasClosestByMatchTag(typeElement, "STRIKE") || hasClosestByMatchTag(typeElement, "S")) {
            setCurrentToolbar(vditor.toolbar.elements, ["strike"]);
        }

        if (hasClosestByMatchTag(typeElement, "A")) {
            setCurrentToolbar(vditor.toolbar.elements, ["link"]);
        }
        const ulElement = hasClosestByMatchTag(typeElement, "UL");
        if (hasClosestByMatchTag(typeElement, "CODE")) {
            if (hasClosestByMatchTag(typeElement, "PRE")) {
                disableToolbar(vditor.toolbar.elements, ["headings", "bold", "italic", "strike", "line", "quote",
                    "list", "ordered-list", "check", "code", "inline-code", "upload", "link", "table", "record"]);
                setCurrentToolbar(vditor.toolbar.elements, ["code"]);
            } else {
                disableToolbar(vditor.toolbar.elements, ["headings", "bold", "italic", "strike", "line", "quote",
                    "list", "ordered-list", "check", "code", "upload", "link", "table", "record"]);
                setCurrentToolbar(vditor.toolbar.elements, ["inline-code"]);
            }
        } else if (hasClosestByTag(typeElement, "H")) {
            disableToolbar(vditor.toolbar.elements, ["bold"]);
            setCurrentToolbar(vditor.toolbar.elements, ["headings"]);
        } else if (ulElement && !ulElement.querySelector("input")) {
            setCurrentToolbar(vditor.toolbar.elements, ["list"]);
        } else if (hasClosestByMatchTag(typeElement, "OL")) {
            setCurrentToolbar(vditor.toolbar.elements, ["ordered-list"]);
        }

        // list popover
        const topUlElement = hasTopClosestByTag(typeElement, "UL");
        const topOlElement = hasTopClosestByTag(typeElement, "OL");
        let topListElement = topUlElement;
        if (topOlElement && (!topUlElement || (topUlElement && topOlElement.contains(topUlElement)))) {
            topListElement = topOlElement;
        }
        if (topListElement && topListElement.querySelector("input")) {
            topListElement = false;
        }
        if (topListElement) {
            vditor.wysiwyg.popover.innerHTML = "";
            const outdent = document.createElement("button");
            outdent.innerHTML = outdentSVG;
            outdent.setAttribute("data-type", "outdent");
            outdent.setAttribute("aria-label", i18n[vditor.options.lang].unindent +
                updateHotkeyTip("<⌘-⇧-s>"));
            outdent.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            outdent.onclick = () => {
                document.execCommand("outdent", false);
            };

            const indent = document.createElement("button");
            indent.innerHTML = indentSVG;
            indent.setAttribute("data-type", "indent");
            indent.setAttribute("aria-label", i18n[vditor.options.lang].indent +
                updateHotkeyTip("<⌘-⇧-e>"));
            indent.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            indent.onclick = () => {
                const cloneRange = getSelection().getRangeAt(0).cloneRange();
                document.execCommand("indent", false);
                // fix 空列表缩进光标会飘逸
                if (!vditor.wysiwyg.element.contains(getSelection().getRangeAt(0).startContainer)) {
                    setSelectionFocus(cloneRange);
                }
            };

            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", outdent);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", indent);

            setPopoverPosition(vditor, topListElement);
        }

        // quote popover
        let blockquoteElement = hasClosestByTag(typeElement, "BLOCKQUOTE") as HTMLTableElement;
        if (blockquoteElement && !(topUlElement && blockquoteElement.contains(topUlElement))) {
            vditor.wysiwyg.popover.innerHTML = "";
            const insertBefore = genInsertBefore(range, blockquoteElement, vditor);
            const insertAfter = genInsertAfter(range, blockquoteElement, vditor);
            const close = genClose(vditor.wysiwyg.popover, blockquoteElement, vditor);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", close);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertBefore);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertAfter);
            setPopoverPosition(vditor, blockquoteElement);
        } else {
            blockquoteElement = undefined;
        }

        // table popover
        const tableElement = hasClosestByMatchTag(typeElement, "TABLE") as HTMLTableElement;
        if (tableElement) {
            vditor.wysiwyg.popover.innerHTML = "";
            const updateTable = () => {
                const oldRow = tableElement.rows.length;
                const oldColumn = tableElement.rows[0].cells.length;
                const row = parseInt(input.value, 10) || oldRow;
                const column = parseInt(input2.value, 10) || oldColumn;

                if (row === oldRow && oldColumn === column) {
                    return;
                }

                if (oldColumn !== column) {
                    const columnDiff = column - oldColumn;
                    for (let i = 0; i < tableElement.rows.length; i++) {
                        if (columnDiff > 0) {
                            for (let j = 0; j < columnDiff; j++) {
                                if (i === 0) {
                                    tableElement.rows[i].lastElementChild.insertAdjacentHTML("afterend", "<th></th>");
                                } else {
                                    tableElement.rows[i].insertCell();
                                }
                            }
                        } else {
                            for (let k = oldColumn - 1; k >= column; k--) {
                                tableElement.rows[i].cells[k].remove();
                            }
                        }
                    }
                }

                if (oldRow !== row) {
                    const rowDiff = row - oldRow;
                    if (rowDiff > 0) {
                        let rowHTML = "<tr>";
                        for (let m = 0; m < column; m++) {
                            rowHTML += "<td></td>";
                        }
                        for (let l = 0; l < rowDiff; l++) {
                            tableElement.querySelector("tbody").insertAdjacentHTML("beforeend", rowHTML);
                        }
                    } else {
                        for (let m = oldRow - 1; m >= row; m--) {
                            tableElement.rows[m].remove();
                        }
                    }
                }
            };

            const close = genClose(vditor.wysiwyg.popover, tableElement, vditor);

            const setAlign = (type: string) => {
                const cell = getSelection().getRangeAt(0).startContainer.parentElement;

                const columnCnt = tableElement.rows[0].cells.length;
                const rowCnt = tableElement.rows.length;
                let currentColumn = 0;

                for (let i = 0; i < rowCnt; i++) {
                    for (let j = 0; j < columnCnt; j++) {
                        if (tableElement.rows[i].cells[j].isEqualNode(cell)) {
                            currentColumn = j;
                            break;
                        }
                    }
                }
                for (let k = 0; k < rowCnt; k++) {
                    tableElement.rows[k].cells[currentColumn].setAttribute("align", type);
                }

                if (type === "right") {
                    left.classList.remove("vditor-icon--current");
                    center.classList.remove("vditor-icon--current");
                    right.classList.add("vditor-icon--current");
                } else if (type === "center") {
                    left.classList.remove("vditor-icon--current");
                    right.classList.remove("vditor-icon--current");
                    center.classList.add("vditor-icon--current");
                } else {
                    center.classList.remove("vditor-icon--current");
                    right.classList.remove("vditor-icon--current");
                    left.classList.add("vditor-icon--current");
                }

                if (vditor.options.cache) {
                    localStorage.setItem(`vditor${vditor.id}`, getMarkdown(vditor));
                }
            };

            const td = hasClosestByMatchTag(typeElement, "TD");
            const th = hasClosestByMatchTag(typeElement, "TH");
            let alignType = "left";
            if (td) {
                alignType = td.getAttribute("align") || "left";
            } else if (th) {
                alignType = th.getAttribute("align") || "center";
            }

            const left = document.createElement("button");
            left.setAttribute("aria-label", i18n[vditor.options.lang].alignLeft);
            left.innerHTML = outdentSVG;
            left.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
                (alignType === "left" ? " vditor-icon--current" : "");
            left.onclick = () => {
                setAlign("left");
            };

            const center = document.createElement("button");
            center.setAttribute("aria-label", i18n[vditor.options.lang].alignCenter);
            center.innerHTML = alignCenterSVG;
            center.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
                (alignType === "center" ? " vditor-icon--current" : "");
            center.onclick = () => {
                setAlign("center");
            };

            const right = document.createElement("button");
            right.setAttribute("aria-label", i18n[vditor.options.lang].alignRight);
            right.innerHTML = indentSVG;
            right.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
                (alignType === "right" ? " vditor-icon--current" : "");
            right.onclick = () => {
                setAlign("right");
            };

            const inputWrap = document.createElement("span");
            inputWrap.setAttribute("aria-label", i18n[vditor.options.lang].row);
            inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input = document.createElement("input");
            inputWrap.appendChild(input);
            input.type = "number";
            input.className = "vditor-input";
            input.style.width = "42px";
            input.style.textAlign = "center";
            input.setAttribute("placeholder", i18n[vditor.options.lang].row);
            input.value = tableElement.rows.length.toString();
            input.onblur = updateTable;
            input.oninput = (event) => {
                updateTable();
                event.preventDefault();
                event.stopPropagation();
            };
            const input2Wrap = document.createElement("span");
            input2Wrap.setAttribute("aria-label", i18n[vditor.options.lang].column);
            input2Wrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input2 = document.createElement("input");
            input2Wrap.appendChild(input2);
            input2.type = "number";
            input2.className = "vditor-input";
            input2.style.width = "42px";
            input2.style.textAlign = "center";
            input2.setAttribute("placeholder", i18n[vditor.options.lang].column);
            input2.value = tableElement.rows[0].cells.length.toString();
            input2.onblur = updateTable;
            input2.oninput = (event) => {
                updateTable();
                event.preventDefault();
                event.stopPropagation();
            };

            const insertBefore = genInsertBefore(range, tableElement, vditor);
            const insertAfter = genInsertAfter(range, tableElement, vditor);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", close);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertBefore);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertAfter);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", left);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", center);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", right);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inputWrap);
            vditor.wysiwyg.popover.insertAdjacentHTML("beforeend", " x ");
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", input2Wrap);
            setPopoverPosition(vditor, tableElement);
        }

        // a popover
        if (typeElement.nodeName === "A") {
            vditor.wysiwyg.popover.innerHTML = "";

            const updateA = () => {
                typeElement.setAttribute("href", input.value);
                typeElement.setAttribute("title", input2.value);
            };

            const inputWrap = document.createElement("span");
            inputWrap.setAttribute("aria-label", i18n[vditor.options.lang].link);
            inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input = document.createElement("input");
            inputWrap.appendChild(input);
            input.className = "vditor-input";
            input.setAttribute("placeholder", i18n[vditor.options.lang].link);
            input.value = typeElement.getAttribute("href") || "";
            input.onblur = updateA;
            input.oninput = (event) => {
                updateA();
                event.preventDefault();
                event.stopPropagation();
            };

            const input2Wrap = document.createElement("span");
            input2Wrap.setAttribute("aria-label", i18n[vditor.options.lang].tooltipText);
            input2Wrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input2 = document.createElement("input");
            input2Wrap.appendChild(input2);
            input2.className = "vditor-input";
            input2.setAttribute("placeholder", i18n[vditor.options.lang].tooltipText);
            input2.style.width = "52px";
            input2.value = typeElement.getAttribute("title") || "";
            input2.onblur = updateA;
            input2.oninput = (event) => {
                updateA();
                event.preventDefault();
                event.stopPropagation();
            };

            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inputWrap);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", input2Wrap);

            setPopoverPosition(vditor, typeElement);
        }

        // img popover
        let imgElement: HTMLImageElement;
        if (range.startContainer.nodeType !== 3 && range.startContainer.childNodes.length > range.startOffset &&
            range.startContainer.childNodes[range.startOffset].nodeName === "IMG") {
            imgElement = range.startContainer.childNodes[range.startOffset] as HTMLImageElement;
            vditor.wysiwyg.popover.innerHTML = "";
            const updateImg = () => {
                imgElement.setAttribute("src", input.value);
                imgElement.setAttribute("alt", alt.value);
                if (aHref.value === "") {
                    if (imgElement.parentElement.nodeName === "A") {
                        imgElement.parentElement.replaceWith(imgElement);
                    }
                } else {
                    if (imgElement.parentElement.nodeName === "A") {
                        imgElement.parentElement.setAttribute("href", aHref.value);
                    } else {
                        const link = document.createElement("a");
                        link.innerHTML = imgElement.outerHTML;
                        link.setAttribute("href", aHref.value);

                        const linkElement = imgElement.parentNode.insertBefore(link, imgElement);
                        imgElement.remove();
                        imgElement = linkElement.querySelector("img");
                    }
                }
            };

            const inputWrap = document.createElement("span");
            inputWrap.setAttribute("aria-label", i18n[vditor.options.lang].imageURL);
            inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input = document.createElement("input");
            inputWrap.appendChild(input);
            input.className = "vditor-input";
            input.setAttribute("placeholder", i18n[vditor.options.lang].imageURL);
            input.value = imgElement.getAttribute("src") || "";
            input.onblur = updateImg;
            input.oninput = (event) => {
                updateImg();
                event.preventDefault();
                event.stopPropagation();
            };
            const altWrap = document.createElement("span");
            altWrap.setAttribute("aria-label", i18n[vditor.options.lang].alternateText);
            altWrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const alt = document.createElement("input");
            altWrap.appendChild(alt);
            alt.className = "vditor-input";
            alt.setAttribute("placeholder", i18n[vditor.options.lang].alternateText);
            alt.style.width = "52px";
            alt.value = imgElement.getAttribute("alt") || "";
            alt.onblur = updateImg;
            alt.oninput = (event) => {
                updateImg();
                event.preventDefault();
                event.stopPropagation();
            };

            const aHrefWrap = document.createElement("span");
            aHrefWrap.setAttribute("aria-label", i18n[vditor.options.lang].link);
            aHrefWrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const aHref = document.createElement("input");
            aHrefWrap.appendChild(aHref);
            aHref.className = "vditor-input";
            aHref.setAttribute("placeholder", i18n[vditor.options.lang].link);
            aHref.value =
                imgElement.parentElement.nodeName === "A" ? imgElement.parentElement.getAttribute("href") : "";
            aHref.onblur = updateImg;
            aHref.oninput = (event) => {
                updateImg();
                event.preventDefault();
                event.stopPropagation();
            };
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inputWrap);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", altWrap);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", aHrefWrap);

            setPopoverPosition(vditor, imgElement);
        }

        const blockElement = hasClosestByClassName(typeElement, "vditor-wysiwyg__block");
        if (blockElement) {
            // block popover: math-inline, math-block, html-block, html-inline, code-block
            const blockType = blockElement.getAttribute("data-type");
            vditor.wysiwyg.popover.innerHTML = "";

            const languageWrap = document.createElement("span");
            languageWrap.setAttribute("aria-label", i18n[vditor.options.lang].language);
            languageWrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const language = document.createElement("input");
            languageWrap.appendChild(language);
            if (blockType.indexOf("block") > -1) {
                const insertBefore = genInsertBefore(range, blockElement, vditor);
                const insertAfter = genInsertAfter(range, blockElement, vditor);
                const close = genClose(vditor.wysiwyg.popover, blockElement, vditor);
                vditor.wysiwyg.popover.insertAdjacentElement("beforeend", close);
                vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertBefore);
                vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertAfter);

                if (blockType === "code-block") {
                    const codeElement = blockElement.firstElementChild.firstElementChild;

                    const updateLanguage = () => {
                        codeElement.className = `language-${language.value}`;
                    };
                    language.className = "vditor-input";
                    language.setAttribute("placeholder", i18n[vditor.options.lang].language);
                    language.value = codeElement.className.indexOf("language-") > -1 ?
                        codeElement.className.split("-")[1].split(" ")[0] : "";
                    language.onblur = updateLanguage;
                    language.oninput = (event) => {
                        updateLanguage();
                        processCodeRender(blockElement, vditor);
                        afterRenderEvent(vditor);
                        event.preventDefault();
                        event.stopPropagation();
                    };
                    language.onkeypress = (event: KeyboardEvent) => {
                        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.altKey) {
                            range.setStart(codeElement.firstChild, 0);
                            range.collapse(true);
                            setSelectionFocus(range);
                            event.preventDefault();
                        }
                    };
                    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", languageWrap);
                }
            }
            setPopoverPosition(vditor, blockElement);
            blockElement.firstElementChild.removeAttribute("style");
        } else {
            vditor.wysiwyg.element.querySelectorAll(".vditor-wysiwyg__block")
                .forEach((blockElementItem: HTMLElement) => {
                    const codeElement = blockElementItem.firstElementChild as HTMLElement;
                    if (codeElement.innerText.trim() !== "") {
                        codeElement.style.display = "none";
                    }
                });
        }

        if (!blockquoteElement && !imgElement && !topListElement && !tableElement && !blockElement
            && typeElement.nodeName !== "A" && !hasClosestByClassName(typeElement, "vditor-panel")) {
            vditor.wysiwyg.popover.style.display = "none";
        }

        if (!vditor.wysiwyg.element.contains(vditor.wysiwyg.popover)) {
            vditor.wysiwyg.element.insertAdjacentElement("beforeend", vditor.wysiwyg.popover);
        }

        // 反斜杠特殊处理
        vditor.wysiwyg.element.querySelectorAll('span[data-type="backslash"] > span').forEach((item: HTMLElement) => {
            item.style.display = "none";
        });
        const backslashElement = hasClosestByAttribute(range.startContainer, "data-type", "backslash");
        if (backslashElement) {
            backslashElement.querySelector("span").style.display = "inline";
        }

    }, 500);
};

const setPopoverPosition = (vditor: IVditor, element: HTMLElement) => {
    vditor.wysiwyg.popover.style.top = (element.offsetTop - 21) + "px";
    vditor.wysiwyg.popover.style.left = element.offsetLeft + "px";
    vditor.wysiwyg.popover.style.display = "block";
};

const genInsertBefore = (range: Range, element: HTMLElement, vditor: IVditor) => {
    const insertBefore = document.createElement("span");
    insertBefore.setAttribute("data-type", "insert-before");
    insertBefore.setAttribute("aria-label", i18n[vditor.options.lang].insertBefore +
        updateHotkeyTip("<⌘-⇧-s>"));
    insertBefore.innerHTML = beforeSVG;
    insertBefore.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    insertBefore.onclick = () => {
        range.setStartBefore(element);
        setSelectionFocus(range);
        const node = document.createElement("p");
        node.setAttribute("data-block", "0");
        node.innerHTML = "\n";
        range.insertNode(node);
        range.collapse(true);
        setSelectionFocus(range);
        highlightToolbar(vditor);
        afterRenderEvent(vditor);
    };
    return insertBefore;
};

const genInsertAfter = (range: Range, element: HTMLElement, vditor: IVditor) => {
    const insertAfter = document.createElement("span");
    insertAfter.setAttribute("data-type", "insert-after");
    insertAfter.setAttribute("aria-label", i18n[vditor.options.lang].insertAfter +
        updateHotkeyTip("<⌘-⇧-e>"));
    insertAfter.innerHTML = afterSVG;
    insertAfter.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    insertAfter.onclick = () => {
        range.setStartAfter(element);
        setSelectionFocus(range);
        const node = document.createElement("p");
        node.setAttribute("data-block", "0");
        node.innerHTML = "\n";
        range.insertNode(node);
        range.collapse(true);
        setSelectionFocus(range);
        highlightToolbar(vditor);
        afterRenderEvent(vditor);
    };
    return insertAfter;
};

const genClose = (popover: HTMLElement, element: HTMLElement, vditor: IVditor) => {
    const close = document.createElement("span");
    close.setAttribute("data-type", "remove");
    close.setAttribute("aria-label", i18n[vditor.options.lang].remove +
        updateHotkeyTip("<⌘-⇧-x>"));
    close.innerHTML = trashcanSVG;
    close.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    close.onclick = () => {
        element.remove();
        popover.style.display = "none";
        highlightToolbar(vditor);
        afterRenderEvent(vditor);
    };
    return close;
};
