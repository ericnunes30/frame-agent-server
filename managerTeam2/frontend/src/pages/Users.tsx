
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { PlusCircle, Filter, MoreHorizontal, Search, Pencil, Trash2 } from 'lucide-react';
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
import { userService, teamService, User, Occupation, CreateUserRequest, UpdateUserRequest } from "@/lib/api";
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
  const [users, setUsers] = useState<User[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Formulário de novo usuário
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    password: string;
    occupation_id: string;
    occupations: number[];
  }>({
    name: '',
    email: '',
    password: '',
    occupation_id: '',
    occupations: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Carregar ocupações (equipes) usando o serviço de equipes
        const occupationsData = await teamService.getTeams();
        console.log('%c Equipes carregadas:', 'background: #3498db; color: white; padding: 2px 5px; border-radius: 3px;', occupationsData);
        console.log('Total de equipes:', occupationsData.length);

        // Mostrar detalhes de cada equipe para depuração
        occupationsData.forEach((team, index) => {
          console.log(`Equipe ${index + 1}:`, {
            id: team.id,
            name: team.name,
            description: team.description
          });
        });

        setOccupations(occupationsData);

        // Carregar usuários
        const usersData = await userService.getUsers();
        console.log('%c Usuários carregados da API:', 'background: #e74c3c; color: white; padding: 2px 5px; border-radius: 3px;', usersData);

        // Processar os dados dos usuários para garantir compatibilidade
        const processedUsers = usersData.map(user => {
          // Garantir que temos occupation_id mesmo se vier como occupationId
          if (user.occupationId && !user.occupation_id) {
            user.occupation_id = user.occupationId;
          }

          // Garantir que temos created_at mesmo se vier como createdAt
          if (user.createdAt && !user.created_at) {
            user.created_at = user.createdAt;
          }

          // Garantir que temos updated_at mesmo se vier como updatedAt
          if (user.updatedAt && !user.updated_at) {
            user.updated_at = user.updatedAt;
          }

          return user;
        });

        console.log('Usuários processados:', processedUsers);
        setUsers(processedUsers);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleTeamChange = (value) => {
    console.log('%c Equipe selecionada:', 'background: #9b59b6; color: white; padding: 2px 5px; border-radius: 3px;', value);

    // Verificar se a ocupação existe na lista
    const occupation = occupations.find(o => o.id.toString() === value);
    console.log('Ocupação encontrada?', occupation ? 'Sim' : 'Não');
    if (occupation) {
      console.log('Detalhes da ocupação selecionada:', occupation);
    } else {
      console.warn('Ocupação não encontrada na lista de ocupações disponíveis');
      console.log('Lista de ocupações disponíveis:', occupations);
    }

    setNewUser(prev => {
      const newState = { ...prev, occupation_id: value };
      console.log('Novo estado do formulário após seleção de equipe:', newState);
      return newState;
    });
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

      // Enviar para a API
      const createdUser = await userService.createUser(userData);
      console.log('Usuário criado:', createdUser);

      // Adicionar novo usuário à lista local
      setUsers(prevUsers => [...prevUsers, createdUser]);

      // Resetar o formulário
      setNewUser({
        name: '',
        email: '',
        password: '',
        occupation_id: '',
        occupations: [],
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
    console.log('%c Iniciando edição de usuário:', 'background: #e74c3c; color: white; padding: 2px 5px; border-radius: 3px;', user);

    // Verificar se o usuário tem occupation_id
    console.log('Usuário tem occupation_id?', user.occupation_id ? 'Sim' : 'Não');
    if (user.occupation_id) {
      console.log('Valor do occupation_id:', user.occupation_id);

      // Verificar se a ocupação existe na lista
      const occupation = occupations.find(o => o.id === user.occupation_id);
      console.log('Ocupação encontrada?', occupation ? 'Sim' : 'Não');
      if (occupation) {
        console.log('Detalhes da ocupação:', occupation);
      }
    }

    // Listar todas as ocupações disponíveis
    console.log('%c Ocupações disponíveis para seleção:', 'background: #2ecc71; color: white; padding: 2px 5px; border-radius: 3px;');
    occupations.forEach((occupation, index) => {
      console.log(`${index + 1}. ID: ${occupation.id}, Nome: ${occupation.name}`);
    });

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

    setEditingUser(user);
    const newUserData = {
      name: user.name,
      email: user.email,
      password: '', // Não preenchemos a senha para edição
      occupation_id: user.occupation_id ? user.occupation_id.toString() : '',
      occupations: userOccupations,
    };

    console.log('Dados do formulário de edição:', newUserData);
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

      // Adicionar occupations se houver
      if (newUser.occupations && newUser.occupations.length > 0) {
        userData.occupations = newUser.occupations;
      }

      // Enviar para a API
      const updatedUser = await userService.updateUser(editingUser.id, userData);
      console.log('Usuário atualizado:', updatedUser);

      // Atualizar o usuário na lista local com a resposta completa da API
      console.log('Resposta completa da API:', updatedUser);

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === editingUser.id ? {
            ...user,
            name: updatedUser.name,
            email: updatedUser.email,
            occupation_id: updatedUser.occupationId || updatedUser.occupation_id, // Suporta ambos os formatos
            created_at: updatedUser.created_at || updatedUser.createdAt,
            updated_at: updatedUser.updated_at || updatedUser.updatedAt
          } : user
        )
      );

      // Log para depuração após a atualização
      setTimeout(() => {
        const updatedUserInState = users.find(u => u.id === editingUser.id);
        console.log('Usuário atualizado no estado:', updatedUserInState);
      }, 100);

      // Resetar o formulário
      setNewUser({
        name: '',
        email: '',
        password: '',
        occupation_id: '',
        occupations: [],
      });
      setEditingUser(null);
      setIsEditDialogOpen(false);

      toast({
        title: "Usuário atualizado",
        description: `${updatedUser.name} foi atualizado com sucesso.`,
      });
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o usuário. Tente novamente.",
      });
    }
  };

  const getTeamName = (user: User) => {
    // Se o usuário tem o objeto occupation completo, use-o diretamente
    if (user.occupation && user.occupation.name) {
      return user.occupation.name;
    }

    // Caso contrário, tente encontrar a ocupação pelo ID
    const occupationId = user.occupationId || user.occupation_id;
    if (!occupationId) return 'Sem equipe';

    const occupation = occupations.find(o => o.id === occupationId);
    return occupation ? occupation.name : 'Equipe desconhecida';
  };

  // Filtragem dos usuários
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <TableHead className="text-right"><Skeleton className="h-4 w-20" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
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
                        {occupations.map((occupation) => (
                          <SelectItem key={occupation.id} value={occupation.id.toString()}>
                            {occupation.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {newUser.occupations.map((occupationId) => {
                        const occupation = occupations.find((o) => o.id === occupationId);
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
                        {occupations.map((occupation) => (
                          <SelectItem key={occupation.id} value={occupation.id.toString()}>
                            {occupation.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {newUser.occupations.map((occupationId) => {
                        const occupation = occupations.find((o) => o.id === occupationId);
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button type="submit" onClick={handleEditUserSave}>Salvar</Button>
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
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Equipes</TableHead>
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
                            const teamName = typeof occ === 'number' ? getTeamName({ occupation_id: occ }) : occ.name;
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
                          {getTeamName(user)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem equipe</span>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
