
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { PlusCircle, Filter, MoreHorizontal, Search, Pencil, Trash2, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { User, Role, CreateUserRequest, UpdateUserRequest } from "@/common/types";
import { useBackendServices } from '@/hooks/useBackendServices'
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mapeamento de equipes para cores
const teamColorMap = {
  1: 'destructive' as const,  // Desenvolvedor Frontend
  2: 'default' as const,      // Desenvolvedor Backend
  3: 'secondary' as const,    // Designer UI/UX
  4: 'outline' as const,      // Gerente de Projetos
  5: 'default' as const       // Analista de Qualidade
};

// Função para obter a classe de cor do badge baseado no ID da equipe
const getBadgeColorClass = (teamId: number) => {
  const colorClasses = {
    1: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200',
    2: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
    3: 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200',
    4: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200',
    5: 'bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200',
    6: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200',
    7: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border-cyan-200',
    8: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200',
  };

  // Se o ID da equipe existir no mapeamento, retorna a classe correspondente
  // Caso contrário, usa um cálculo para distribuir as cores de forma cíclica
  const colorIndex = teamId ? (teamId % Object.keys(colorClasses).length) || teamId : 1;
  return colorClasses[colorIndex] || 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200';
};

const Users = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Estado para controlar a atualização
  const [dataError, setDataError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { users: usersService, roles: rolesService, occupations: occupationsService } = useBackendServices();
  const {
    data: usersQueryData,
    isLoading: usersLoading,
    isError: usersIsError,
    error: usersError,
    refetch,
  } = usersService.useGetUsers();
  const {
    data: rolesQueryData,
    isLoading: rolesLoading,
    isError: rolesIsError,
    error: rolesError,
    refetch: refetchRoles,
  } = rolesService.useGetRoles();
  const {
    data: occupationsQueryData,
    isLoading: occupationsLoading,
    isError: occupationsIsError,
    error: occupationsError,
    refetch: refetchOccupations,
  } = occupationsService.useGetOccupations();
  const error =
    (usersIsError || rolesIsError || occupationsIsError
      ? 'Não foi possível carregar os dados.'
      : null);
  const loading = usersLoading || rolesLoading || occupationsLoading;
  const { mutateAsync: mutateUser } = usersService.useCreateUser();
  const { mutate: deleteUserMutate } = usersService.useDeleteUser();

  // Formulário de novo usuário
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    password: string;
    occupation_id: string;
    occupations: number[];
    roles: number[];
  }>({
    name: '',
    email: '',
    password: '',
    occupation_id: '',
    occupations: [],
    roles: [],
  });

  // Função para atualizar manualmente a lista de usuários
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchRoles(), refetchOccupations()]);
    setRefreshing(false);
  };

  // Função para carregar dados (extraída para ser reutilizável)
  const fetchData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setDataLoading(true);
    }
    setDataError(null);

    try {
      const [rolesRes, occupationsRes] = await Promise.all([
        refetchRoles(),
        refetchOccupations(),
      ]);
      const rolesData = rolesRes.data || [];
      const occupationsData = occupationsRes.data || [];


      return { users: [], roles: rolesData, occupations: occupationsData };
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setDataError('Não foi possível carregar os dados. Tente novamente mais tarde.');
      return null;
    } finally {
      if (showLoadingIndicator) {
        setDataLoading(false);
      }
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    fetchData();
  }, []);





  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleTeamChange = (value) => {
    // Verificar se a ocupação existe na lista
    const occupation = Array.isArray(occupationsQueryData) ? occupationsQueryData.find(o => o.id.toString() === value) : null;
    if (!occupation) {
      console.warn('Ocupação não encontrada na lista de ocupações disponíveis');
    }

    setNewUser(prev => ({ ...prev, occupation_id: value }));
  };

  const handleAddUser = async () => {
    // Validação básica
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome, email e senha são obrigatórios",
      });
      return;
    }

    try {
      // Criar objeto de usuário para a API
      const userData: CreateUserRequest = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
      };

      // Adicionar occupation_id se estiver definido
      if (newUser.occupation_id) {
        userData.occupation_id = parseInt(newUser.occupation_id);
      }

      // Adicionar occupations se houver
      if (newUser.occupations && newUser.occupations.length > 0) {
        userData.occupations = newUser.occupations;
      }

      // Adicionar roles se houver
      if (newUser.roles && newUser.roles.length > 0) {
        userData.roles = newUser.roles;
      }

      const createdUser = await mutateUser({ data: userData });

      // Resetar o formulário
      setNewUser({
        name: '',
        email: '',
        password: '',
        occupation_id: '',
        occupations: [],
        roles: [],
      });

      setIsDialogOpen(false);

      toast({
        title: "Usuário adicionado",
        description: `${createdUser.name} foi adicionado com sucesso.`,
      });

    } catch (err) {
      console.error('Erro ao criar usuário:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o usuário. Tente novamente.",
      });
    }
  };

  // Função para iniciar a edição de um usuário
  const handleEditUserStart = (user: User) => {
    // Verificar se o usuário tem occupation_id
    if (user.occupation_id) {
      const occupation = Array.isArray(occupationsQueryData) ? occupationsQueryData.find(o => o.id === user.occupation_id) : null;
      if (!occupation) {
        console.warn('Ocupação não encontrada para o usuário em edição');
      }
    }

    // Preparar as ocupações do usuário
    let userOccupations: number[] = [];

    // Se o usuário tem múltiplas ocupações
    if (user.occupations && user.occupations.length > 0) {
      userOccupations = user.occupations.map(occ => occ.id);
    }
    // Se o usuário tem apenas uma ocupação
    else if (user.occupation_id || user.occupationId) {
      const occupationId = user.occupation_id || user.occupationId;
      if (occupationId) {
        userOccupations = [occupationId];
      }
    }

    // Preparar as roles do usuário
    let userRoles: number[] = [];

    // Se o usuário tem roles
    if (user.roles && Array.isArray(user.roles)) {
      // Se roles é um array de objetos com id
      if (user.roles.length > 0 && typeof user.roles[0] === 'object' && 'id' in user.roles[0]) {
        userRoles = user.roles.map(role => role.id);
      }
      // Se roles é um array de números
      else if (user.roles.length > 0 && typeof user.roles[0] === 'number') {
        userRoles = user.roles as number[];
      }
    }

    setEditingUser(user);
    const newUserData = {
      name: user.name,
      email: user.email,
      password: '', // Não preenchemos a senha para edição
      occupation_id: user.occupation_id ? user.occupation_id.toString() : '',
      occupations: userOccupations,
      roles: userRoles,
    };

    setNewUser(newUserData);
    setIsEditDialogOpen(true);
  };

  // Função para salvar a edição de um usuário
  const handleEditUserSave = async () => {
    if (!editingUser || !newUser.name || !newUser.email) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome e email são obrigatórios",
      });
      return;
    }

    try {
      // Criar objeto de usuário para a API
      const userData: UpdateUserRequest = {
        name: newUser.name,
        email: newUser.email,
      };

      // Adicionar senha se estiver definida
      if (newUser.password) {
        userData.password = newUser.password;
      }

      // Adicionar occupation_id se estiver definido
      if (newUser.occupation_id) {
        userData.occupation_id = parseInt(newUser.occupation_id);
      }

      // Adicionar teams se houver
      if (newUser.occupations && newUser.occupations.length > 0) {
        userData.teams = newUser.occupations;
      }

      // Adicionar roles se houver
      if (newUser.roles && newUser.roles.length > 0) {
        userData.roles = newUser.roles;
      }

      const updatedUser = await mutateUser({ id: editingUser.id, data: userData });
      toast({
        title: "Usuário atualizado",
        description: `${updatedUser.name} foi atualizado com sucesso.`,
      });
      // Resetar o formulário
      setNewUser({
        name: '',
        email: '',
        password: '',
        occupation_id: '',
        occupations: [],
        roles: [],
      });
      setEditingUser(null);
      setIsEditDialogOpen(false);

    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o usuário. Tente novamente.",
      });
    }
  };

  const getOccupationName = (user: User) => {
    // Se o usuário tem o objeto occupation completo, use-o diretamente
    if (user.occupation && user.occupation.name) {
      return user.occupation.name;
    }

    // Caso contrário, tente encontrar a ocupação pelo ID
    const occupationId = user.occupationId || user.occupation_id;
    if (!occupationId) return 'Sem ocupação';

    const occupation = Array.isArray(occupationsQueryData) ? occupationsQueryData.find(o => o.id === occupationId) : null;
    return occupation ? occupation.name : 'Ocupação desconhecida';
  };

  // Função para obter o nome da role pelo ID
  const getRoleName = (roleId: number) => {
    const role = Array.isArray(rolesQueryData) ? rolesQueryData.find(r => r.id === roleId) : null;
    return role ? role.name : `Função ${roleId}`;
  };

  // Função para iniciar o processo de exclusão de um usuário
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // Função para confirmar e executar a exclusão de um usuário
  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;

    try {
      await deleteUserMutate(userToDelete.id);

      // Guardar o nome do usuário antes de limpar o estado
      const deletedUserName = userToDelete.name;

      // Fechar o diálogo e limpar o usuário selecionado
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);

      toast({
        title: "Usuário removido",
        description: `${deletedUserName} foi removido com sucesso.`,
      });

    } catch (err) {
      console.error('Erro ao excluir usuário:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o usuário. Tente novamente.",
      });
    }
  };

  // Filtragem dos usuários
  const filteredUsers = Array.isArray(usersQueryData) ? usersQueryData.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Renderizar tela de carregamento
  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]"><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-4 w-20" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie usuários, permissões e equipes.
            </p>
          </div>
          {/* Diálogo para adicionar novo usuário */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <PlusCircle className="h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes do usuário. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={newUser.name}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={newUser.email}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={newUser.password}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="Senha"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="occupation" className="text-right pt-2">
                    Equipes
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const occupationId = parseInt(value);
                        if (!newUser.occupations.includes(occupationId)) {
                          setNewUser(prev => ({
                            ...prev,
                            occupations: [...prev.occupations, occupationId]
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Adicionar equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(occupationsQueryData) ? occupationsQueryData.map((occupation) => (
                          <SelectItem key={occupation.id} value={occupation.id.toString()}>
                            {occupation.name}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {newUser.occupations.map((occupationId) => {
                        const occupation = Array.isArray(occupationsQueryData) ? occupationsQueryData.find((o) => o.id === occupationId) : null;
                        return (
                          <div
                            key={occupationId}
                            className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                          >
                            {occupation ? occupation.name : `Equipe ${occupationId}`}
                            <button
                              type="button"
                              onClick={() => {
                                setNewUser(prev => ({
                                  ...prev,
                                  occupations: prev.occupations.filter((id) => id !== occupationId)
                                }));
                              }}
                              className="text-secondary-foreground/70 hover:text-secondary-foreground"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="roles" className="text-right pt-2">
                    Nível de Permissão
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={newUser.roles.length > 0 ? newUser.roles[0].toString() : ""}
                      onValueChange={(value) => {
                        const roleId = parseInt(value);
                        setNewUser(prev => ({
                          ...prev,
                          roles: [roleId] // Substitui o array inteiro por um único ID
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar nível de permissão" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(rolesQueryData) ? rolesQueryData.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>

                    {newUser.roles.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">
                          Nível de permissão selecionado:
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className="rounded-full bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-200"
                          >
                            {getRoleName(newUser.roles[0])}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddUser}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Diálogo para editar usuário */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Usuário</DialogTitle>
                <DialogDescription>
                  Atualize os detalhes do usuário. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={newUser.name}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={newUser.email}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-password" className="text-right">
                    Senha
                  </Label>
                  <Input
                    id="edit-password"
                    name="password"
                    type="password"
                    value={newUser.password}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="Deixe em branco para manter a senha atual"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit-occupation" className="text-right pt-2">
                    Equipes
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const occupationId = parseInt(value);
                        if (!newUser.occupations.includes(occupationId)) {
                          setNewUser(prev => ({
                            ...prev,
                            occupations: [...prev.occupations, occupationId]
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Adicionar equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(occupationsQueryData) ? occupationsQueryData.map((occupation) => (
                          <SelectItem key={occupation.id} value={occupation.id.toString()}>
                            {occupation.name}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {newUser.occupations.map((occupationId) => {
                        const occupation = Array.isArray(occupationsQueryData) ? occupationsQueryData.find((o) => o.id === occupationId) : null;
                        return (
                          <div
                            key={occupationId}
                            className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                          >
                            {occupation ? occupation.name : `Equipe ${occupationId}`}
                            <button
                              type="button"
                              onClick={() => {
                                setNewUser(prev => ({
                                  ...prev,
                                  occupations: prev.occupations.filter((id) => id !== occupationId)
                                }));
                              }}
                              className="text-secondary-foreground/70 hover:text-secondary-foreground"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit-roles" className="text-right pt-2">
                    Nível de Permissão
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={newUser.roles.length > 0 ? newUser.roles[0].toString() : ""}
                      onValueChange={(value) => {
                        const roleId = parseInt(value);
                        setNewUser(prev => ({
                          ...prev,
                          roles: [roleId] // Substitui o array inteiro por um único ID
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar nível de permissão" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(rolesQueryData) ? rolesQueryData.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>

                    {newUser.roles.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">
                          Nível de permissão selecionado:
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className="rounded-full bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-200"
                          >
                            {getRoleName(newUser.roles[0])}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button type="submit" onClick={handleEditUserSave}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Diálogo para confirmar exclusão de usuário */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Remover Usuário</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover o usuário {userToDelete?.name}?
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center bg-destructive/10 p-3 rounded-md mt-2">
                <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                <p className="text-sm">Todos os dados relacionados a este usuário serão perdidos.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button variant="destructive" onClick={handleDeleteUserConfirm}>Remover</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" title="Filtrar">
            <Filter className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Atualizar lista"
            onClick={handleRefresh}
            disabled={refreshing}
            className={refreshing ? "animate-spin" : ""}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Equipes</TableHead>
                <TableHead>Nível de Permissão</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarFallback>
                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.occupations && user.occupations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.occupations.map(occ => {
                            const teamId = typeof occ === 'number' ? occ : occ.id;
                            const teamName = typeof occ === 'number' ? (Array.isArray(occupationsQueryData) ? occupationsQueryData.find(o => o.id === occ)?.name : null) || 'Ocupação desconhecida' : occ.name;
                            const badgeColor = getBadgeColorClass(teamId);

                            return (
                              <Badge
                                key={teamId}
                                variant="outline"
                                className={`rounded-full ${badgeColor}`}
                              >
                                {teamName}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (user.occupation_id || user.occupationId || user.occupation) ? (
                        <Badge
                          variant="outline"
                          className={`rounded-full ${getBadgeColorClass(user.occupation_id || user.occupationId)}`}
                        >
                          {getOccupationName(user)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem equipe</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.roles && Array.isArray(user.roles) && user.roles.length > 0 ? (
                        <Badge
                          variant="outline"
                          className="rounded-full bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-200"
                        >
                          {typeof user.roles[0] === 'number'
                            ? getRoleName(user.roles[0])
                            : user.roles[0].name || `Função ${user.roles[0].id}`}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem permissão</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at || user.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUserStart(user)}
                          title="Editar usuário"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user)}
                          title="Remover usuário"
                          className="text-red-500 hover:text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Users;
