// Traduz os erros do Firebase Auth para mensagens que a equipe consiga entender.
export function translateAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "E-mail ou senha incorretos.";
    case "auth/invalid-email":
      return "Esse e-mail não parece válido.";
    case "auth/email-already-in-use":
      return "Já existe uma conta com esse e-mail. Entre, ou use “Esqueci minha senha” se não lembra a senha.";
    case "auth/weak-password":
      return "Senha fraca demais. Use pelo menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
    case "auth/network-request-failed":
      return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
    case "auth/user-disabled":
      return "Essa conta foi desativada.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.";
    case "auth/unauthorized-domain":
      return "Este endereço do site ainda não está autorizado no Firebase (Authentication > Settings > Authorized domains).";
    case "auth/operation-not-allowed":
      return "Esse tipo de login não está ativado no Firebase (Authentication > Sign-in method).";
    case "auth/requires-recent-login":
      return "Por segurança, saia e entre de novo antes de fazer essa alteração.";
  }

  const message = error instanceof Error ? error.message : "";
  return message || "Algo deu errado. Tente novamente.";
}

// Fechar o pop-up do Google não é um erro que mereça aviso.
export function isUserCancelledAuth(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}
