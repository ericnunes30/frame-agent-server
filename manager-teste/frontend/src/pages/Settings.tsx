
import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { useBackendServices } from '@/hooks/useBackendServices';
import { useAuth } from '@/contexts/AuthContext';

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Insira um email válido.",
  }),
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, {
      message: "Informe a senha atual.",
    }),
    newPassword: z.string().min(6, {
      message: "A nova senha deve ter pelo menos 6 caracteres.",
    }),
    confirmPassword: z.string().min(6, {
      message: "Confirme a nova senha.",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem.",
  });

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(
    window.localStorage.getItem("theme") === "dark"
  );

  const services = useBackendServices();
  const { user } = useAuth();

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    profileForm.reset({
      name: user?.name || "",
      email: user?.email || "",
    });
  }, [user]);

  const handleDarkModeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    // Atualizar o tema
    if (newMode) {
      document.documentElement.classList.add("dark");
      window.localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      window.localStorage.setItem("theme", "light");
    }
  };

  const updateProfile = services.profile.useUpdateProfile();
  const changePassword = services.profile.useChangePassword();

  async function onSubmit(data: z.infer<typeof profileFormSchema>) {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado. Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateProfile.mutateAsync({ userId: user.id, data });
      toast({
        title: "Perfil atualizado",
        description: "As alterações no seu perfil foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    }
  }

  async function onSubmitPassword(data: z.infer<typeof passwordFormSchema>) {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado. Não foi possível alterar a senha.",
        variant: "destructive",
      });
      return;
    }
    try {
      await changePassword.mutateAsync({
        userId: user.id,
        newPassword: data.newPassword,
      });
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso.",
      });
      passwordForm.reset();
    } catch (error) {
      toast({
        title: "Erro ao alterar senha",
        description: "Não foi possível alterar sua senha.",
        variant: "destructive",
      });
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas configurações de conta e preferências.
          </p>
        </div>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Perfil</CardTitle>
                <CardDescription>
                  Atualize seus dados de perfil e informações de conta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit">Salvar alterações</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Atualize sua senha de acesso.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha Atual</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nova Senha</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Nova Senha</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Alterar Senha</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência da interface.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Modo Escuro</p>
                    <p className="text-sm text-muted-foreground">
                      Ative o modo escuro para reduzir o cansaço visual.
                    </p>
                  </div>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={handleDarkModeToggle}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/**
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>
                  Configure como você deseja receber notificações.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificações por Email</p>
                    <p className="text-sm text-muted-foreground">
                      Receba atualizações e lembretes por email.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificações no Navegador</p>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações no navegador enquanto estiver usando o sistema.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Lembretes de Tarefas</p>
                    <p className="text-sm text-muted-foreground">
                      Receba lembretes sobre tarefas próximas do prazo.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          */}
          
          {/**
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Sistema</CardTitle>
                <CardDescription>
                  Configure opções gerais do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Idioma</p>
                    <p className="text-sm text-muted-foreground">
                      O idioma padrão do sistema é Português do Brasil.
                    </p>
                  </div>
                  <Button variant="outline">Alterar</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Backup de Dados</p>
                    <p className="text-sm text-muted-foreground">
                      Faça backup de seus dados e projetos.
                    </p>
                  </div>
                  <Button variant="outline">Exportar</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Limpar Cache</p>
                    <p className="text-sm text-muted-foreground">
                      Limpe dados temporários do sistema.
                    </p>
                  </div>
                  <Button variant="outline">Limpar</Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="destructive">Redefinir Configurações</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          */}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
