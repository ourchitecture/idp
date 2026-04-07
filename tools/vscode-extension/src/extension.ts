import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Stemix IDP extension is now active');

  const helloIdpCommand = vscode.commands.registerCommand(
    'stemix-idp.helloIdp',
    () => {
      vscode.window.showInformationMessage(
        'Hello IDP! Welcome to the Stemix Intent-Driven Portal VS Code extension.'
      );
    }
  );

  context.subscriptions.push(helloIdpCommand);
}

export function deactivate() {
  console.log('Stemix IDP extension is now deactivated');
}
