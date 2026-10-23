'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { DataTable } from '@/components/common/data-table';
import { Modal } from '@/components/common/modal';
import { Badge } from '@/components/common/badge';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { Task } from '@/types';
import { demoDate } from '@/data/uae-records';

interface TasksViewProps {
  showToast: (msg: string) => void;
}

export function TasksView({ showToast }: TasksViewProps) {
  const { user, permissions, role } = useAuth();
  const { tasks, addTask, updateTask, updateTaskStatus, vehicles, drivers } = useFleet();

  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalTask, setModalTask] = useState<Task | null | 'new'>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [employee, setEmployee] = useState(user?.name || 'Zayed Al Mansoori');
  const [vehicle, setVehicle] = useState(vehicles[0]?.registration || 'Dubai A-10842');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [due, setDue] = useState(demoDate);

  const isEmployee = role === 'Employee';

  // Filter tasks: Employees see only their assigned tasks unless unrestricted
  const visibleTasks = isEmployee
    ? tasks.filter((t) => t.employee === user?.name)
    : tasks;

  const filteredTasks = visibleTasks.filter((t) => {
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    const matchSearch = `${t.title} ${t.description} ${t.employee} ${t.vehicle}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const handleOpenNew = () => {
    setTitle('');
    setDescription('');
    setEmployee(user?.name || 'Zayed Al Mansoori');
    setVehicle(vehicles[0]?.registration || 'Dubai A-10842');
    setPriority('Medium');
    setDue(demoDate);
    setModalTask('new');
  };

  const handleOpenEdit = (t: Task) => {
    setTitle(t.title);
    setDescription(t.description);
    setEmployee(t.employee);
    setVehicle(t.vehicle);
    setPriority(t.priority);
    setDue(t.due);
    setModalTask(t);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (modalTask === 'new') {
      addTask({
        title: title.trim(),
        description: description.trim(),
        employee,
        vehicle,
        priority,
        due,
        status: 'To do',
        createdBy: user?.name
      });
      showToast('Task added to dispatch queue');
    } else if (modalTask && typeof modalTask === 'object') {
      updateTask(modalTask.id, {
        title: title.trim(),
        description: description.trim(),
        employee,
        vehicle,
        priority,
        due
      });
      showToast('Task updated successfully');
    }

    setModalTask(null);
  };

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <input
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 170 }}
          />

          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="To do">To do</option>
            <option value="In progress">In progress</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            aria-label="Filter priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>

        <div className="filters">
          <button
            type="button"
            className="button"
            onClick={() => setViewMode(viewMode === 'list' ? 'board' : 'list')}
            aria-label="Toggle Kanban view"
          >
            {viewMode === 'list' ? (
              <>
                <LayoutGrid size={14} /> Board View
              </>
            ) : (
              <>
                <List size={14} /> List View
              </>
            )}
          </button>

          {permissions?.canCreateTasks && (
            <button
              type="button"
              className="button primary"
              onClick={handleOpenNew}
            >
              <Plus size={15} /> Add Task
            </button>
          )}
        </div>
      </div>

      {viewMode === 'board' ? (
        /* Kanban Board View */
        <div className="kanban">
          {(['To do', 'In progress', 'Completed'] as const).map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col);
            return (
              <div className="kanban-column" key={col}>
                <h3>
                  {col}
                  <span>{colTasks.length}</span>
                </h3>

                {colTasks.map((t) => (
                  <div className="task-card" key={t.id}>
                    <Badge>{t.priority}</Badge>
                    <h3>{t.title}</h3>
                    <p>{t.description}</p>
                    <small>
                      {t.employee} · Due: {t.due}
                    </small>
                    <small style={{ color: '#0c2f4a', fontWeight: 600 }}>
                      Vehicle: {t.vehicle}
                    </small>

                    <select
                      aria-label="Update task status"
                      value={t.status}
                      onChange={(e) =>
                        updateTaskStatus(
                          t.id,
                          e.target.value as 'To do' | 'In progress' | 'Completed'
                        )
                      }
                      style={{ marginTop: 10 }}
                    >
                      <option value="To do">To do</option>
                      <option value="In progress">In progress</option>
                      <option value="Completed">Completed</option>
                    </select>

                    <button
                      type="button"
                      className="text-button"
                      style={{ marginTop: 8 }}
                      onClick={() => handleOpenEdit(t)}
                    >
                      Edit details
                    </button>
                  </div>
                ))}

                {!colTasks.length && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
                    No tasks in {col}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Standard Table View */
        <Panel
          title="Fleet Operations Task Directory"
          sub={`${filteredTasks.length} tasks scheduled`}
        >
          <DataTable
            rows={filteredTasks}
            columns={[
              ['title', 'Task Description'],
              ['employee', 'Assigned To'],
              ['vehicle', 'Target Vehicle Plate'],
              ['priority', 'Priority'],
              ['due', 'Due Date'],
              ['status', 'Execution Status']
            ]}
            exportable
            exportName="trackwe-uae-tasks"
            action={(t: Task) => (
              <div className="row-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => handleOpenEdit(t)}
                >
                  Edit
                </button>
                {t.status !== 'Completed' && (
                  <button
                    type="button"
                    className="text-button"
                    style={{ color: '#2d8c75' }}
                    onClick={() => {
                      updateTaskStatus(t.id, 'Completed');
                      showToast(`Task marked completed: ${t.title}`);
                    }}
                  >
                    Complete
                  </button>
                )}
              </div>
            )}
          />
        </Panel>
      )}

      {/* Add / Edit Task Modal */}
      <Modal
        open={!!modalTask}
        onClose={() => setModalTask(null)}
        title={modalTask === 'new' ? 'Create Operations Task' : 'Edit Task Details'}
      >
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <label style={{ gridColumn: '1 / -1' }}>
              Task Title
              <input
                required
                placeholder="e.g. Refrigeration compressor leak test"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              Description / Checklist
              <input
                required
                placeholder="Detailed instructions for field operator"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <label>
              Assigned Field Operator
              <select
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                disabled={isEmployee}
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Target UAE Vehicle
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.registration}>
                    {v.registration} — {v.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Priority Level
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'High' | 'Medium' | 'Low')
                }
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </label>

            <label>
              Target Due Date
              <input
                type="date"
                required
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button"
              onClick={() => setModalTask(null)}
            >
              Cancel
            </button>
            <button type="submit" className="button primary">
              {modalTask === 'new' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
