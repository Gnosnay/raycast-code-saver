import { Action, ActionPanel, Form, Icon, LaunchProps, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { createSnippet, useDataFetch } from "../../lib/hooks/use-data-ops";
import { Label, Library } from "../../lib/types/dto";
import InitError from "../init/init-error";
import { SnippetMarkdownFormatType } from "../../lib/constants/db-name";
import { useState } from "react";
import { getAvatarIcon } from "@raycast/utils";
import { labelIcon } from "../../lib/utils/snippet-utils";

export interface SnippetValues {
    title: string
    fileName: string
    content: string
    formatType: SnippetMarkdownFormatType
    libraryUUID: string
    labelsUUID: string[]
}

export default function CreateSnippetEntry({ props }: { props: LaunchProps<{ draftValues: SnippetValues }> }) {
    const { isLoading: isLibLoading, data: allLibs, error: loadLibErr } = useDataFetch<Library>('library');
    const { isLoading: isLabelLoading, data: allLabels, error: loadLabelErr } = useDataFetch<Label>('label');

    const isLoading = isLibLoading || isLabelLoading;
    const { draftValues } = props;
    const [labelsUUID, setLabels] = useState<string[]>(draftValues?.labelsUUID ?? []);
    const [titleError, setTitleError] = useState<string | undefined>();
    const [fileNameError, setFileNameError] = useState<string | undefined>();
    const [contentError, setContentError] = useState<string | undefined>();
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const { push } = useNavigation();

    function dropTitleErrorIfNeeded() {
        if (titleError && titleError.length > 0) {
            setTitleError(undefined);
        }
    }

    function dropFileNameErrorIfNeeded() {
        if (fileNameError && fileNameError.length > 0) {
            setFileNameError(undefined);
        }
    }

    function dropContentErrorIfNeeded() {
        if (contentError && contentError.length > 0) {
            setContentError(undefined);
        }
    }

    async function handleSubmit(values: SnippetValues) {
        if (values.title.length === 0) {
            setTitleError("Snippet title is required");
            return;
        }
        if (values.fileName.length === 0) {
            setFileNameError("Filename is required");
            return
        }
        if (values.content.length === 0) {
            setContentError("File content is required");
            return
        }
        setIsSubmitting(true);
        const response = await createSnippet({
            title: values.title,
            fileName: values.fileName,
            content: values.content,
            formatType: values.formatType,
            libraryUUID: values.libraryUUID,
            labelsUUID: values.labelsUUID,
        });

        if (response === undefined) {
            showToast({
                style: Toast.Style.Success,
                title: "Snippet saved",
                message: `"${values.title}" was saved.`,
            });
            popToRoot();
        } else {
            push(<InitError errMarkdown={response} />)
        }

        setIsSubmitting(false);
    }

    const errMsg = function (err) {
        if (err !== undefined) {
            return `# Something wrong
Some errors happened when fetching labels or libraries from database. 
Error details are as follows:
\`\`\`
${err instanceof Error ? err.stack : String(err)}
\`\`\`
`;
        }
        return null;
    }(loadLabelErr || loadLibErr);

    return (errMsg ? <InitError errMarkdown={errMsg} /> :
        <Form
            enableDrafts
            isLoading={isLoading || isSubmitting}
            actions={
                <ActionPanel>
                    <Action.SubmitForm onSubmit={handleSubmit} title="Save Snippet" />
                </ActionPanel>
            }
        >
            <Form.TextField
                id="title"
                title="Snippet Title"
                placeholder="Give one brief description for this snippet"
                error={titleError}
                onChange={dropTitleErrorIfNeeded}
                onBlur={(event) => {
                    if (event.target.value?.length === 0) {
                        setTitleError("Snippet title is required");
                    } else {
                        dropTitleErrorIfNeeded();
                    }
                }}
                autoFocus={true}
                defaultValue={draftValues?.title ?? ""}
            />
            <Form.TextField
                id="fileName"
                title="Filename"
                placeholder="useful-commands.sh"
                onChange={dropFileNameErrorIfNeeded}
                error={fileNameError}
                onBlur={(event) => {
                    if (event.target.value?.length === 0) {
                        setFileNameError("Filename is required");
                    } else {
                        dropFileNameErrorIfNeeded();
                    }
                }}
                defaultValue={draftValues?.fileName ?? ""}
            />
            <Form.TextArea
                id="content"
                error={contentError}
                onBlur={(event) => {
                    if (event.target.value?.length === 0) {
                        setContentError("File content is required");
                    } else {
                        dropContentErrorIfNeeded();
                    }
                }}
                title="File content"
                defaultValue={draftValues?.content ?? ""}
            />
            <Form.Dropdown id="formatType" title="Snippet Content Format">
                <Form.Dropdown.Item value="freestyle" key="freestyle" title="Freestyle" icon={Icon.Person} />
                <Form.Dropdown.Item value="tldr" key="tldr" title="TLDR" icon={Icon.Building} />
            </Form.Dropdown>
            <Form.Dropdown id="libraryUUID" title="Library">
                {allLibs?.map((lib) => (
                    <Form.Dropdown.Item value={lib.uuid} key={lib.uuid} title={lib.name} icon={getAvatarIcon(lib.name)} />
                ))}
            </Form.Dropdown>
            <Form.TagPicker id="labelsUUID" title="Labels" value={labelsUUID} onChange={setLabels} storeValue={true}>
                {allLabels?.map((label) => (
                    <Form.TagPicker.Item key={label.uuid} title={label.title} value={label.uuid} icon={labelIcon(label)} />
                ))}
            </Form.TagPicker>
        </Form>
    );
}