import React, { useState, useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Briefcase, AlertCircle, UserPlus, Pencil, Trash2, Calendar } from 'lucide-react';
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
import { Team, UserOccupation, User } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';

const TeamsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [occupationName, setOccupationName] = useState('');
  const [selectedOccupationIdForUser, setSelectedOccupationIdForUser] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editingOccupation, setEditingOccupation] = useState<Team | null>(null);
  const [occupationToDelete, setOccupationToDelete] = useState<Team | null>(null);

  const { users: usersService, teams: teamsService } = useBackendServices();
  const {
    data: teamsQueryData = [],
    isLoading: teamsLoading,
    isError: teamsIsError,
    error: teamsError,
    refetch: refetchTeams,
  } = teamsService.useGetTeams();

  const { mutateAsync: createTeamMutate } = teamsService.useCreateTeam();
  const { mutateAsync: updateTeamMutate } = teamsService.useUpdateTeam();
  const { mutateAsync: deleteTeamMutate } = teamsService.useDeleteTeam();
  const { data: usersQueryData = [] } = usersService.useGetUsers();

  // Since the API endpoint doesn't exist, we'll derive team users from the main team data
  const derivedTeamUsers = React.useMemo(() => {
    const map: Record<number, User[]> = {};
    if (Array.isArray(teamsQueryData)) {
      teamsQueryData.forEach((team) => {
        // Use the users preloaded in the team data
        map[team.id] = team.users || [];
      });
    }
    return map;
  }, [teamsQueryData]);
 
  const loading = teamsLoading;
  const error = teamsIsError ? 'Não foi possível carregar as equipes.' : (teamsError as any)?.message || null;


  const handleAddOccupation = async () => {
    if (!occupationName.trim()) {
      toast.error('O nome da equipe é obrigatório');
      return;
    }
    try {
      await createTeamMutate({ name: occupationName, description: '' });
      setOccupationName('');
      setIsDialogOpen(false);
      toast.success('Equipe criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamUsers'] });
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível criar a equipe. Tente novamente.');
    }
  };

  // Commented out as backend API doesn't support these operations
  // const handleAddUserToOccupation = async () => {
  //   if (!selectedUserId || !selectedOccupationIdForUser) {
  //     toast.error('Por favor, selecione um usuário e uma ocupação');
  //     return;
  //   }
  //   try {
  //     const userId = parseInt(selectedUserId);
  //     const teamId = selectedOccupationIdForUser;
  //     await addUserToTeamMutate({
  //       teamId: teamId,
  //       userId: userId,
  //     });
  //     setSelectedUserId('');
  //     setAddUserDialogOpen(false);
  //     setSelectedOccupationIdForUser(null);
  //     toast.success('Usuário adicionado à equipe com sucesso!');
  //     queryClient.invalidateQueries({ queryKey: ['teamUsers', teamId] });
  //   } catch (err) {
  //     toast.error((err as Error).message || 'Não foi possível adicionar o usuário à equipe. Tente novamente.');
  //   }
  // };

  // const handleRemoveUserFromTeam = async (teamId: number, userId: number) => {
  //   if (!confirm('Tem certeza que deseja remover este usuário da equipe?')) {
  //     return;
  //   }
  //   try {
  //     await removeUserFromTeamMutate({ teamId, userId });
  //     toast.success('Usuário removido da equipe com sucesso!');
  //     queryClient.invalidateQueries({ queryKey: ['teamUsers', teamId] });
  //   } catch (err) {
  //     toast.error((err as Error).message || 'Não foi possível remover o usuário da equipe. Tente novamente.');
  //   }
  // };

  const handleEditOccupationStart = (team: Team) => {
    setEditingOccupation(team);
    setOccupationName(team.name);
    setIsEditDialogOpen(true);
  };

  const handleDeleteOccupation = (team: Team) => {
    setOccupationToDelete(team);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteOccupationConfirm = async () => {
    if (!occupationToDelete) return;
    try {
      await deleteTeamMutate(occupationToDelete.id);
      setIsDeleteDialogOpen(false);
      setOccupationToDelete(null);
      toast.success(`Equipe ${occupationToDelete.name} removida com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamUsers'] });
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível excluir a equipe. Tente novamente.');
    }
  };

  const handleEditOccupationSave = async () => {
    if (!editingOccupation || !occupationName.trim()) {
      toast.error('O nome da equipe é obrigatório');
      return;
    }
    try {
      await updateTeamMutate({ id: editingOccupation.id, data: { name: occupationName, description: editingOccupation.description || '' } });
      setOccupationName('');
      setEditingOccupation(null);
      setIsEditDialogOpen(false);
      toast.success('Equipe atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamUsers'] });
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível atualizar a equipe. Tente novamente.');
    }
  };

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
              Gerencie suas equipes e atribua usuários.
            </p>
          </div>
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
                    value={occupationName}
                    onChange={(e) => setOccupationName(e.target.value)}
                    className="col-span-3"
                    placeholder="Nome da equipe"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddOccupation}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                    value={occupationName}
                    onChange={(e) => setOccupationName(e.target.value)}
                    className="col-span-3"
                    placeholder="Nome da equipe"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button type="submit" onClick={handleEditOccupationSave}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Remover Equipe</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover a equipe {occupationToDelete?.name}?
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center bg-destructive/10 p-3 rounded-md mt-2">
                <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                <p className="text-sm">Todos os dados relacionados a esta equipe serão perdidos.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button variant="destructive" onClick={handleDeleteOccupationConfirm}>Remover</Button>
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
          {Array.isArray(teamsQueryData) && teamsQueryData.length > 0 ? ( // Alterado occupationsQueryData para teamsQueryData
            teamsQueryData.map((team) => ( // Renomeado de 'occupation' para 'team'
              <Card key={team.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{team.name}</h3>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            {derivedTeamUsers[team.id]?.length || 0} usuários 
                          </div>
                           {team.created_at && (
                            <div className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              Criado em {new Date(team.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog open={addUserDialogOpen && selectedOccupationIdForUser === team.id} onOpenChange={(isOpen) => {
                          if (!isOpen) {
                            setAddUserDialogOpen(false);
                            setSelectedOccupationIdForUser(null);
                            setSelectedUserId(''); // Limpa o usuário selecionado ao fechar
                          } else {
                             setSelectedOccupationIdForUser(team.id);
                             setAddUserDialogOpen(true); // Abre o diálogo
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // A lógica de abertura agora está no onOpenChange
                              }}
                              className="gap-1.5"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              Adicionar Usuário
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adicionar Usuário à Equipe: {team.name}</DialogTitle>
                              <DialogDescription>
                                Selecione um usuário para adicionar a esta equipe.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-select" className="text-right">
                                  Usuário
                                </Label>
                                <Select
                                  value={selectedUserId}
                                  onValueChange={setSelectedUserId}
                                >
                                  <SelectTrigger id="user-select" className="col-span-3">
                                    <SelectValue placeholder="Selecione um usuário" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.isArray(usersQueryData) ? usersQueryData.filter(user =>
                                      !derivedTeamUsers[team.id]?.find(ou => ou.id === user.id) // Alterado derivedOccupationUsers para derivedTeamUsers
                                    ).map((user) => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name} ({user.email})
                                      </SelectItem>
                                    )) : []}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                               <Button variant="outline" onClick={() => {
                                setAddUserDialogOpen(false);
                                setSelectedOccupationIdForUser(null);
                                setSelectedUserId('');
                              }} className="mr-2">
                                Cancelar
                              </Button>
                              <Button type="submit" onClick={() => {
                                toast.error('Funcionalidade não disponível - API não implementada');
                                setAddUserDialogOpen(false);
                                setSelectedOccupationIdForUser(null);
                                setSelectedUserId('');
                              }}>Adicionar</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditOccupationStart(team)} // Renomeado para 'team'
                            title="Editar equipe"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleDeleteOccupation(team)} // Renomeado para 'team'
                            title="Remover equipe"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          Usuários na Equipe
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {derivedTeamUsers[team.id]?.length || 0} usuários 
                        </span>
                      </div>

                      {derivedTeamUsers[team.id]?.length > 0 ? ( // Alterado derivedOccupationUsers para derivedTeamUsers
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {derivedTeamUsers[team.id].map((user) => ( // Alterado derivedOccupationUsers para derivedTeamUsers
                            <div key={`${team.id}-${user.id}`} className="flex items-center justify-between p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                   <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                                  <AvatarFallback className="text-xs">
                                    {user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="font-medium text-sm">
                                  {user.name || user.email || `Usuário ${user.id}`}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                                onClick={() => toast.error('Funcionalidade não disponível - API não implementada')}
                                title="Remover usuário da equipe"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                         <div className="text-muted-foreground text-sm p-3 bg-muted rounded-md text-center">
                           Nenhum usuário nesta equipe. Adicione usuários usando o botão acima.
                         </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            !loading && !error && (
            <Card className="col-span-1">
              <CardContent className="p-6 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma Equipe Encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando uma nova equipe para organizar seus usuários.
                </p>
                <Button className="gap-1" onClick={() => setIsDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4" />
                  Criar Nova Equipe
                </Button>
              </CardContent>
            </Card>
            )
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default TeamsPage;
