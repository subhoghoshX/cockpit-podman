import React from 'react';
import {
    Button, Checkbox,
    Form, FormGroup,
    Modal, Radio, TextInput
} from '@patternfly/react-core';
import cockpit from 'cockpit';

import * as utils from './util.js';
import * as client from './client.js';
import { ErrorNotification } from './Notification.jsx';
import { fmt_to_fragments } from 'utils.jsx';

const _ = cockpit.gettext;

class ContainerCommitModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            imageName: "",
            tag: "",
            author:"",
            command: props.container.Command ? utils.quote_cmdline(props.container.Command) : "",
            pause: true,
            format: "oci",
            selectedFormat: "oci",
            commitInProgress: false,
        };

        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleCommit = this.handleCommit.bind(this);
    }

    handleInputChange(targetName, value) {
        this.setState({
            [targetName]: value
        });
    }

    handleCommit() {
        if (!this.state.imageName) {
            this.setState({ dialogError: "Image name is required" });
            return;
        }

        function quote(word) {
            word = word.replace(/"/g, '\\"');
            return '"' + word + '"';
        }

        const commitData = {};
        commitData.container = this.props.container.Id;
        commitData.repo = this.state.imageName;
        commitData.author = this.state.author;
        commitData.pause = this.state.pause;
        commitData.format = this.state.format;

        if (this.state.tag)
            commitData.tag = this.state.tag;

        commitData.changes = [];
        if (this.state.command.trim() !== "") {
            let cmdData = "";
            const words = utils.unquote_cmdline(this.state.command.trim());
            const cmdStr = words.map(quote).join(", ");
            cmdData = "CMD [" + cmdStr + "]";
            commitData.changes.push(cmdData);
        }

        this.setState({ commitInProgress: true });
        client.commitContainer(this.props.container.isSystem, commitData)
                .then(() => this.props.onHide())
                .catch(ex => {
                    this.setState({
                        dialogError: cockpit.format(_("Failed to commit container $0"), this.props.container.Names),
                        dialogErrorDetail: cockpit.format("$0: $1", ex.message, ex.reason),
                        commitInProgress: false
                    });
                });
    }

    handleFormatChange(selectItem) {
        this.setState({
            selectedFormat: selectItem,
            format: selectItem,
        });
    }

    render() {
        const commitContent =
            <Form isHorizontal>
                <FormGroup fieldId="commit-dialog-format" label={_("Format")} isInline>
                    <Radio id="format-oci" value="oci"
                           name="format"
                           label="oci"
                           isChecked={this.state.selectedFormat === 'oci'}
                           onChange={format => this.handleFormatChange(format)} />
                    <Radio id="format-docker" value="docker"
                           name="format"
                           label="docker"
                           isChecked={this.state.selectedFormat === 'docker'}
                           onChange={format => this.handleFormatChange(format)} />
                </FormGroup>

                <FormGroup fieldId="commit-dialog-image-name" label={_("Image name")}>
                    <TextInput id="commit-dialog-image-name"
                               value={this.state.imageName}
                               onChange={value => this.handleInputChange("imageName", value)} />
                </FormGroup>

                <FormGroup fieldId="commit-dialog-image-tag" label={_("Tag")}>
                    <TextInput id="commit-dialog-image-tag"
                               value={this.state.tag}
                               onChange={value => this.handleInputChange("tag", value)} />
                </FormGroup>

                <FormGroup fieldId="commit-dialog-author" label={_("Author")}>
                    <TextInput id="commit-dialog-author"
                               value={this.state.author}
                               onChange={value => this.handleInputChange("author", value)} />
                </FormGroup>

                <FormGroup fieldId="commit-dialog-command" label={_("Command")}>
                    <TextInput id="commit-dialog-command"
                               value={this.state.command}
                               onChange={value => this.handleInputChange("command", value)} />
                </FormGroup>

                <FormGroup fieldId="commit-dialog-pause">
                    <Checkbox id="commit-dialog-pause"
                              isChecked={this.state.pause}
                              onChange={value => this.handleInputChange("pause", value)}
                              label={_("Pause the container")} />
                </FormGroup>
            </Form>;

        return (
            <Modal isOpen
                   showClose={false}
                   position="top" variant="medium"
                   title={_("Commit container")}
                   description={fmt_to_fragments(_("Create a new image based on the current state of the $0 container."), <b>{this.props.container.Names}</b>)}
                   footer={<>
                       {this.state.dialogError && <ErrorNotification errorMessage={this.state.dialogError} errorDetail={this.state.dialogErrorDetail} onDismiss={() => this.setState({ dialogError: undefined })} />}
                       <Button variant="primary"
                               className="btn-ctr-commit"
                               isLoading={this.state.commitInProgress}
                               isDisabled={this.state.commitInProgress}
                               onClick={this.handleCommit}>
                           {_("Commit")}
                       </Button>
                       <Button variant="link"
                               className="btn-ctr-cancel-commit"
                               isDisabled={this.state.commitInProgress}
                               onClick={this.props.onHide}>
                           {_("Cancel")}
                       </Button>
                   </>}
            >
                {commitContent}
            </Modal>
        );
    }
}

export default ContainerCommitModal;
