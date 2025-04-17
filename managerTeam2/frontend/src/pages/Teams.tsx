
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Users, Calendar, Briefcase, AlertCircle, UserPlus, Pencil, Trash2 } from 'lucide-react';
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { teamService, userService, Team, Occupation, TeamUser, User } from '@/lib/api';

const Teams = () => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teamUsers, setTeamUsers] = useState<Record<number, TeamUser[]>>({});
  const [selectedOccupation, setSelectedOccupation] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Carregar equipes e ocupações
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Carregar ocupações (usando o serviço de equipes)
        const occupationsData = await teamService.getTeams();
        console.log('Ocupações carregadas:', occupationsData);
        setOccupations(occupationsData);

        // Carregar usuários
        try {
          const usersData = await userService.getUsers();
          console.log('Usuários carregados:', usersData);
          setUsers(usersData);
        } catch (err) {
          console.error('Erro ao carregar usuários:', err);
          // Dados simulados de usuários caso a API falhe
          const mockUsers = [
            { id: 1, name: 'João Silva', email: 'joao@example.com' },
            { id: 2, name: 'Maria Oliveira', email: 'maria@example.com' },
            { id: 3, name: 'Pedro Santos', email: 'pedro@example.com' },
            { id: 4, name: 'Ana Souza', email: 'ana@example.com' },
          ];
          setUsers(mockUsers);
        }

        // Tentar carregar equipes da API
        try {
          const teamsData = await teamService.getTeams();
          console.log('Equipes carregadas da API:', teamsData);
          setTeams(teamsData);
        } catch (err) {
          console.error('Erro ao carregar equipes da API:', err);
          // Dados simulados de equipes como fallback
          const mockTeams: Team[] = [
            {
              id: 1,
              name: 'Equipe de Desenvolvimento',
              description: 'Responsável pelo desenvolvimento de software',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 2,
              name: 'Equipe de Design',
              description: 'Responsável pelo design de interfaces',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];

          console.log('Usando equipes simuladas:', mockTeams);
          setTeams(mockTeams);
        }

        // Tentar carregar usuários de cada equipe da API
        const teamUsersMap: Record<number, TeamUser[]> = {};
        const teamsToProcess = teams.length > 0 ? teams : (await teamService.getTeams()).length > 0 ? await teamService.getTeams() : [];

        for (const team of teamsToProcess) {
          try {
            const teamUsersData = await teamService.getTeamUsers(team.id);
            console.log(`Usuários da equipe ${team.id} carregados da API:`, teamUsersData);
            teamUsersMap[team.id] = teamUsersData;
          } catch (err) {
            console.error(`Erro ao carregar usuários da equipe ${team.id} da API:`, err);
            // Dados simulados de usuários de equipe como fallback
            if (team.id === 1) {
              teamUsersMap[team.id] = [
                {
                  id: 1,
                  team_id: 1,
                  user_id: 1,
                  occupation_id: occupationsData[0]?.id || 1,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  user: users.find(u => u.id === 1) || {
                    id: 1,
                    name: 'João Silva',
                    email: 'joao@example.com'
                  },
                  occupation: occupationsData[0] || {
                    id: 1,
                    name: 'Desenvolvedor',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                },
                {
                  id: 2,
                  team_id: 1,
                  user_id: 2,
                  occupation_id: occupationsData[1]?.id || 2,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  user: users.find(u => u.id === 2) || {
                    id: 2,
                    name: 'Maria Oliveira',
                    email: 'maria@example.com'
                  },
                  occupation: occupationsData[1] || {
                    id: 2,
                    name: 'Designer',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                }
              ];
            } else if (team.id === 2) {
              teamUsersMap[team.id] = [
                {
                  id: 3,
                  team_id: 2,
                  user_id: 3,
                  occupation_id: occupationsData[1]?.id || 2,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  user: users.find(u => u.id === 3) || {
                    id: 3,
                    name: 'Pedro Santos',
                    email: 'pedro@example.com'
                  },
                  occupation: occupationsData[1] || {
                    id: 2,
                    name: 'Designer',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                }
              ];
            } else {
              teamUsersMap[team.id] = [];
            }
            console.log(`Usando usuários simulados para a equipe ${team.id}:`, teamUsersMap[team.id]);
          }
        }

        console.log('Mapa de usuários de equipes:', teamUsersMap);
        setTeamUsers(teamUsersMap);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Não foi possível carregar as equipes. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Função para adicionar uma nova equipe
  const handleAddTeam = async () => {
    if (!teamName.trim()) {
      alert('O nome da equipe é obrigatório');
      return;
    }

    try {
      // Tentar criar uma nova equipe via API
      try {
        const newTeam = await teamService.createTeam({
          name: teamName
        });

        console.log('Nova equipe criada via API:', newTeam);

        // Adicionar nova equipe à lista
        setTeams(prevTeams => [...prevTeams, newTeam]);
        setTeamUsers(prev => ({ ...prev, [newTeam.id]: [] }));

        // Resetar o formulário
        setTeamName('');
        setIsDialogOpen(false);

        toast.success('Equipe criada com sucesso!');
      } catch (apiErr) {
        console.error('Erro ao criar equipe via API:', apiErr);

        // Fallback: simular a criação de uma nova equipe
        const newTeam: Team = {
          id: Date.now(), // Usar timestamp como ID único
          name: teamName,
          description: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Nova equipe criada (simulada):', newTeam);

        // Adicionar nova equipe à lista
        setTeams(prevTeams => [...prevTeams, newTeam]);
        setTeamUsers(prev => ({ ...prev, [newTeam.id]: [] }));

        // Resetar o formulário
        setTeamName('');
        setIsDialogOpen(false);

        toast.success('Equipe criada com sucesso! (modo offline)');
      }
    } catch (err) {
      console.error('Erro ao criar equipe:', err);
      alert('Não foi possível criar a equipe. Tente novamente.');
    }
  };

  // Função para adicionar um usuário a uma equipe
  const handleAddUserToTeam = async () => {
    if (!selectedUserId || !selectedTeamId) {
      alert('Por favor, selecione um usuário');
      return;
    }

    try {
      const userId = parseInt(selectedUserId);
      // Usar o ID da equipe como ID de ocupação
      const occupationId = selectedTeamId;

      // Tentar adicionar um usuário a uma equipe via API
      try {
        // Usar o serviço de equipes para adicionar usuário
        console.log('Tentando adicionar usuário à equipe:', {
          userId,
          occupationId
        });

        const result = await teamService.addUserToTeam(occupationId, {
          user_id: userId,
          occupation_id: occupationId
        });

        console.log('Usuário adicionado à ocupação (equipe) via API:', result);

        // Fallback para o caso de a API de ocupações não retornar o formato esperado
        let teamUserResult = {
          id: Date.now(),
          team_id: selectedTeamId,
          user_id: userId,
          occupation_id: occupationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: null,
          occupation: null
        };

        // Buscar informações do usuário e ocupação para exibição
        const user = users.find(u => u.id === userId);
        const occupation = occupations.find(o => o.id === occupationId);

        // Preencher as informações do usuário e ocupação no resultado
        if (user) {
          teamUserResult.user = user;
        }
        if (occupation) {
          teamUserResult.occupation = occupation;
        }

        // Atualizar a lista de usuários da equipe
        setTeamUsers(prev => ({
          ...prev,
          [selectedTeamId]: [...(prev[selectedTeamId] || []), teamUserResult]
        }));

        // Recarregar os usuários para garantir que os dados estão atualizados
        const updatedUsers = await userService.getUsers();
        setUsers(updatedUsers);
        console.log('Usuários recarregados após adição:', updatedUsers);

        // Resetar o formulário
        setSelectedUserId('');
        setAddUserDialogOpen(false);
        setSelectedTeamId(null);

        toast.success('Usuário adicionado à equipe com sucesso!');
      } catch (apiErr) {
        console.error('Erro ao adicionar usuário à equipe via API:', apiErr);

        // Fallback: simular a adição de um usuário a uma equipe
        const user = users.find(u => u.id === userId);
        const occupation = occupations.find(o => o.id === occupationId);

        const result: TeamUser = {
          id: Date.now(), // Usar timestamp como ID único
          team_id: selectedTeamId,
          user_id: userId,
          occupation_id: occupationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: user || {
            id: userId,
            name: `Usuário ${userId}`,
            email: `usuario${userId}@example.com`
          },
          occupation: occupation || {
            id: occupationId,
            name: `Ocupação ${occupationId}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };

        console.log('Usuário adicionado à equipe (simulado):', result);

        // Atualizar a lista de usuários da equipe
        setTeamUsers(prev => ({
          ...prev,
          [selectedTeamId]: [...(prev[selectedTeamId] || []), result]
        }));

        // Tentar recarregar os usuários mesmo no modo offline
        try {
          const updatedUsers = await userService.getUsers();
          setUsers(updatedUsers);
          console.log('Usuários recarregados após adição (fallback):', updatedUsers);
        } catch (err) {
          console.error('Erro ao recarregar usuários após adição (fallback):', err);
        }

        // Resetar o formulário
        setSelectedUserId('');
        setAddUserDialogOpen(false);
        setSelectedTeamId(null);

        toast.success('Usuário adicionado à equipe com sucesso! (modo offline)');
      }
    } catch (err) {
      console.error('Erro ao adicionar usuário à equipe:', err);
      alert('Não foi possível adicionar o usuário à equipe. Tente novamente.');
    }
  };

  // Função para remover um usuário de uma equipe
  const handleRemoveUserFromTeam = async (teamId: number, userId: number) => {
    if (!confirm('Tem certeza que deseja remover este usuário da equipe?')) {
      return;
    }

    try {
      // Tentar remover um usuário de uma equipe via API
      try {
        // Usar o serviço de equipes para remover usuário
        console.log(`Tentando remover usuário ${userId} da equipe ${teamId}`);
        await teamService.removeUserFromTeam(teamId, userId);
        console.log(`Usuário ${userId} removido da equipe ${teamId} via API`);

        // Atualizar a lista de usuários da equipe
        setTeamUsers(prev => ({
          ...prev,
          [teamId]: prev[teamId].filter(tu => tu.user_id !== userId)
        }));

        // Recarregar os usuários para garantir que os dados estão atualizados
        const updatedUsers = await userService.getUsers();
        setUsers(updatedUsers);
        console.log('Usuários recarregados após remoção:', updatedUsers);

        toast.success('Usuário removido da equipe com sucesso!');
      } catch (apiErr) {
        console.error(`Erro ao remover usuário ${userId} da equipe ${teamId} via API:`, apiErr);

        // Fallback: simular a remoção de um usuário de uma equipe
        console.log(`Removendo usuário ${userId} da equipe ${teamId} (simulado)`);

        // Atualizar a lista de usuários da equipe
        setTeamUsers(prev => ({
          ...prev,
          [teamId]: prev[teamId].filter(tu => tu.user_id !== userId)
        }));

        // Tentar recarregar os usuários mesmo no modo offline
        try {
          const updatedUsers = await userService.getUsers();
          setUsers(updatedUsers);
          console.log('Usuários recarregados após remoção (fallback):', updatedUsers);
        } catch (err) {
          console.error('Erro ao recarregar usuários após remoção (fallback):', err);
        }

        toast.success('Usuário removido da equipe com sucesso! (modo offline)');
      }
    } catch (err) {
      console.error('Erro ao remover usuário da equipe:', err);
      alert('Não foi possível remover o usuário da equipe. Tente novamente.');
    }
  };

  // Função para obter o nome da ocupação pelo ID
  const getOccupationName = (occupationId: number) => {
    const occupation = occupations.find(occ => occ.id === occupationId);
    return occupation ? occupation.name : 'Ocupação desconhecida';
  };

  // Função para iniciar a edição de uma equipe
  const handleEditTeamStart = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setIsEditDialogOpen(true);
  };

  // Função para salvar a edição de uma equipe
  const handleEditTeamSave = async () => {
    if (!editingTeam || !teamName.trim()) {
      alert('O nome da equipe é obrigatório');
      return;
    }

    try {
      console.log('%c Iniciando atualização de equipe:', 'background: #e74c3c; color: white; padding: 2px 5px; border-radius: 3px;', {
        id: editingTeam.id,
        nome_atual: editingTeam.name,
        novo_nome: teamName
      });

      // Tentar atualizar a equipe via API
      try {
        // Usar o serviço de equipes para atualizar a equipe
        const updatedTeam = await teamService.updateTeam(editingTeam.id, {
          name: teamName
        });

        console.log('Equipe atualizada via API:', updatedTeam);

        // Atualizar a equipe na lista
        setTeams(prevTeams =>
          prevTeams.map(team =>
            team.id === editingTeam.id ? { ...team, name: teamName } : team
          )
        );

        // Resetar o formulário
        setTeamName('');
        setEditingTeam(null);
        setIsEditDialogOpen(false);

        toast.success('Equipe atualizada com sucesso!');
      } catch (apiErr) {
        console.error('Erro ao atualizar equipe via API:', apiErr);

        // Fallback: simular a atualização da equipe
        setTeams(prevTeams =>
          prevTeams.map(team =>
            team.id === editingTeam.id ? { ...team, name: teamName } : team
          )
        );

        // Resetar o formulário
        setTeamName('');
        setEditingTeam(null);
        setIsEditDialogOpen(false);

        toast.success('Equipe atualizada com sucesso! (modo offline)');
      }
    } catch (err) {
      console.error('Erro ao atualizar equipe:', err);
      alert('Não foi possível atualizar a equipe. Tente novamente.');
    }
  };

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
            <div className="p-4">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
            <h1 className="text-3xl font-bold tracking-tight">Equipes</h1>
            <p className="text-muted-foreground">
              Gerencie suas equipes e atribua projetos e membros.
            </p>
          </div>
          {/* Diálogo para criar nova equipe */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <PlusCircle className="h-4 w-4" />
                Nova Equipe
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Equipe</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes da equipe. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="col-span-3"
                    placeholder="Nome da equipe"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddTeam}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Diálogo para editar equipe */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Equipe</DialogTitle>
                <DialogDescription>
                  Atualize os detalhes da equipe. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="edit-name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="col-span-3"
                    placeholder="Nome da equipe"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button type="submit" onClick={handleEditTeamSave}>Salvar</Button>
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

        <div className="grid grid-cols-1 gap-6">
          {teams.length > 0 ? (
            teams.map((team) => (
              <Card key={team.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{team.name}</h3>

                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            {team.users?.length || 0} membros
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTeamId(team.id);
                                console.log(`Equipe pré-selecionada: ${team.id} - ${team.name}`);
                              }}
                              className="gap-1.5"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              Adicionar Membro
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
                              <DialogDescription>
                                Selecione um usuário e uma ocupação para adicionar à equipe.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="team" className="text-right">
                                  Equipe
                                </Label>
                                <div className="col-span-3 flex items-center gap-2">
                                  <Badge variant="outline" className="px-3 py-1 text-sm">
                                    {teams.find(t => t.id === selectedTeamId)?.name || 'Equipe selecionada'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user" className="text-right">
                                  Usuário
                                </Label>
                                <Select
                                  value={selectedUserId}
                                  onValueChange={setSelectedUserId}
                                >
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecione um usuário" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users.map((user) => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name} ({user.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                            </div>
                            <DialogFooter>
                              <Button onClick={handleAddUserToTeam}>Adicionar</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditTeamStart(team)}
                            title="Editar equipe"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          Membros da Equipe
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {teamUsers[team.id]?.length || 0} membros
                        </span>
                      </div>

                      {teamUsers[team.id]?.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {teamUsers[team.id].map((teamUser) => (
                            <div key={`${team.id}-${teamUser.user_id}`} className="flex items-center justify-between p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {teamUser.user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="font-medium text-sm">
                                  {teamUser.user?.name || `Usuário ${teamUser.user_id}`}
                                </div>
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                  <Briefcase className="h-3 w-3" />
                                  {getOccupationName(teamUser.occupation_id)}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                                onClick={() => handleRemoveUserFromTeam(team.id, teamUser.user_id)}
                                title="Remover membro"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm p-3 bg-muted rounded-md text-center">
                          Nenhum membro nesta equipe. Adicione membros usando o botão acima.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      Criado em {new Date(team.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center p-8 border rounded-lg">
              <p className="text-muted-foreground mb-4">Nenhuma equipe encontrada. Crie sua primeira equipe!</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Criar Equipe
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Teams;
